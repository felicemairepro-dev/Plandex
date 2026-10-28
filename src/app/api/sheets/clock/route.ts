import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { parisWallTimeToISOString } from "@/lib/date-utils";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

interface ExtraForMatch {
  id: string;
  full_name: string | null;
}

// Reçoit les pointages saisis dans le Google Sheet du planning (voir le
// script Apps Script fourni à l'admin) et les répercute dans time_entries,
// en créant au passage le créneau (shifts) correspondant s'il n'existe pas
// encore — ce Sheet remplace le pointage manuel sur le site pour les
// équipiers qu'il concerne, il n'y a donc pas de créneau pré-existant.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SHEETS_SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const prenom = typeof body?.prenom === "string" ? body.prenom.trim() : "";
  const date = typeof body?.date === "string" ? body.date : "";
  // Une clé absente = "ne pas toucher à ce champ" ; une chaîne vide = "effacer
  // ce pointage" (la case a été vidée dans le Sheet) ; sinon, une heure HH:mm.
  const hasArrivee =
    typeof body === "object" && body !== null && "heureArrivee" in body;
  const hasDepart =
    typeof body === "object" && body !== null && "heureDepart" in body;
  const heureArrivee = hasArrivee ? String(body.heureArrivee ?? "") : null;
  const heureDepart = hasDepart ? String(body.heureDepart ?? "") : null;

  if (!prenom || !DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "prenom et date (YYYY-MM-DD) sont obligatoires." },
      { status: 400 }
    );
  }
  if (!hasArrivee && !hasDepart) {
    return NextResponse.json(
      { error: "heureArrivee ou heureDepart est obligatoire." },
      { status: 400 }
    );
  }
  if (
    (heureArrivee && !TIME_RE.test(heureArrivee)) ||
    (heureDepart && !TIME_RE.test(heureDepart))
  ) {
    return NextResponse.json(
      { error: "Les heures doivent être au format HH:mm (ou vide pour effacer)." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: extras, error: extrasError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "extra")
    .eq("supprime", false)
    .returns<ExtraForMatch[]>();

  if (extrasError) {
    console.error("sheets/clock: profiles lookup failed:", extrasError);
    return NextResponse.json({ error: extrasError.message }, { status: 500 });
  }

  const target = normalize(prenom);
  const matches = (extras ?? []).filter(
    (e) => normalize(e.full_name?.split(" ")[0] ?? "") === target
  );

  if (matches.length === 0) {
    return NextResponse.json(
      { error: `Aucun équipier Plandex ne correspond au prénom "${prenom}".` },
      { status: 404 }
    );
  }
  if (matches.length > 1) {
    return NextResponse.json(
      {
        error: `Plusieurs équipiers correspondent au prénom "${prenom}" — renommez l'un des comptes pour lever l'ambiguïté.`,
      },
      { status: 409 }
    );
  }

  const extraId = matches[0].id;

  const { data: existingShift, error: shiftLookupError } = await supabase
    .from("shifts")
    .select("id")
    .eq("extra_id", extraId)
    .eq("date", date)
    .maybeSingle<{ id: string }>();

  if (shiftLookupError) {
    console.error("sheets/clock: shift lookup failed:", shiftLookupError);
    return NextResponse.json(
      { error: shiftLookupError.message },
      { status: 500 }
    );
  }

  let shiftId = existingShift?.id;
  const hasActualTime = Boolean(heureArrivee) || Boolean(heureDepart);

  if (!shiftId) {
    // Rien à effacer et rien à créer : la case était déjà vide, on ignore.
    if (!hasActualTime) {
      return NextResponse.json({ success: true, noop: true });
    }

    const defaultTime = heureArrivee || heureDepart || "00:00";
    const { data: newShift, error: shiftCreateError } = await supabase
      .from("shifts")
      .insert({
        date,
        heure_debut: heureArrivee || defaultTime,
        heure_fin: heureDepart || defaultTime,
        lieu: "Stand Parly 2",
        poste: "Vente",
        extra_id: extraId,
        statut: "confirme",
        cree_par: extraId,
      })
      .select("id")
      .single<{ id: string }>();

    if (shiftCreateError || !newShift) {
      console.error("sheets/clock: shift creation failed:", shiftCreateError);
      return NextResponse.json(
        { error: shiftCreateError?.message ?? "Création du créneau impossible." },
        { status: 500 }
      );
    }
    shiftId = newShift.id;
  }

  const timeEntryPayload: Record<string, unknown> = {
    shift_id: shiftId,
    extra_id: extraId,
  };
  if (hasArrivee) {
    timeEntryPayload.heure_arrivee = heureArrivee
      ? parisWallTimeToISOString(date, heureArrivee)
      : null;
  }
  if (hasDepart) {
    timeEntryPayload.heure_depart = heureDepart
      ? parisWallTimeToISOString(date, heureDepart)
      : null;
  }

  const { error: upsertError } = await supabase
    .from("time_entries")
    .upsert(timeEntryPayload, { onConflict: "shift_id" });

  if (upsertError) {
    console.error("sheets/clock: time_entries upsert failed:", upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  revalidatePath("/dashboard/hours");
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");

  return NextResponse.json({ success: true });
}
