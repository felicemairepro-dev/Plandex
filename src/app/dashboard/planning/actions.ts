"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { sendShiftAssignedEmail } from "@/lib/email";
import { getDateRange } from "@/lib/date-utils";
import type { ActionResult, ShiftStatus } from "@/lib/types";

const MAX_RANGE_DAYS = 31;

interface NewShiftRow {
  date: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  poste: string;
  extra_id: string;
  statut: ShiftStatus;
  cree_par: string;
}

function readShiftFields(formData: FormData) {
  return {
    date: String(formData.get("date") || ""),
    heure_debut: String(formData.get("heure_debut") || ""),
    heure_fin: String(formData.get("heure_fin") || ""),
    lieu: String(formData.get("lieu") || "").trim(),
    poste: String(formData.get("poste") || "").trim(),
    extra_id: String(formData.get("extra_id") || ""),
    statut: String(formData.get("statut") || "confirme") as ShiftStatus,
  };
}

function validateShift(fields: ReturnType<typeof readShiftFields>) {
  if (
    !fields.date ||
    !fields.heure_debut ||
    !fields.heure_fin ||
    !fields.lieu ||
    !fields.poste ||
    !fields.extra_id
  ) {
    return "Tous les champs sont obligatoires.";
  }
  if (fields.heure_fin <= fields.heure_debut) {
    return "L'heure de fin doit être après l'heure de début.";
  }
  return null;
}

function validateTimes(heureDebut: string, heureFin: string) {
  if (!heureDebut || !heureFin) {
    return "Les horaires sont obligatoires pour chaque jour.";
  }
  if (heureFin <= heureDebut) {
    return "L'heure de fin doit être après l'heure de début.";
  }
  return null;
}

async function notifyShiftsAssigned(
  extraId: string,
  shifts: Pick<
    NewShiftRow,
    "date" | "heure_debut" | "heure_fin" | "lieu" | "poste"
  >[]
) {
  const supabase = await createClient();
  const { data: extra } = await supabase
    .from("profiles")
    .select("email, full_name, taux_horaire")
    .eq("id", extraId)
    .single<{
      email: string | null;
      full_name: string | null;
      taux_horaire: number | null;
    }>();

  if (extra?.email) {
    for (const shift of shifts) {
      await sendShiftAssignedEmail({
        to: extra.email,
        extraFirstName: extra.full_name?.split(" ")[0] || "",
        tauxHoraire: extra.taux_horaire,
        shift,
      });
    }
  }

  const message =
    shifts.length === 1
      ? `Nouveau créneau assigné le ${new Date(`${shifts[0].date}T00:00:00`).toLocaleDateString("fr-FR")} (${shifts[0].poste})`
      : `${shifts.length} nouveaux créneaux assignés du ${new Date(`${shifts[0].date}T00:00:00`).toLocaleDateString("fr-FR")} au ${new Date(`${shifts[shifts.length - 1].date}T00:00:00`).toLocaleDateString("fr-FR")} (${shifts[0].poste})`;

  await supabase.from("notifications").insert({
    user_id: extraId,
    message,
  });
}

async function createShiftRange(
  userId: string,
  formData: FormData
): Promise<ActionResult> {
  const dateDebut = String(formData.get("dateDebut") || "");
  const dateFin = String(formData.get("dateFin") || "");
  const sameHours = formData.get("sameHours") === "true";
  const lieu = String(formData.get("lieu") || "").trim();
  const poste = String(formData.get("poste") || "").trim();
  const extraId = String(formData.get("extra_id") || "");
  const statut = String(formData.get("statut") || "confirme") as ShiftStatus;

  if (!dateDebut || !dateFin || !lieu || !poste || !extraId) {
    return { error: "Tous les champs sont obligatoires." };
  }

  const dates = getDateRange(dateDebut, dateFin, MAX_RANGE_DAYS);
  if (dates.length === 0) {
    return {
      error:
        "La plage de dates est invalide (la date de fin doit être après la date de début).",
    };
  }

  let sharedHeureDebut = "";
  let sharedHeureFin = "";
  if (sameHours) {
    sharedHeureDebut = String(formData.get("heure_debut") || "");
    sharedHeureFin = String(formData.get("heure_fin") || "");
    const timeError = validateTimes(sharedHeureDebut, sharedHeureFin);
    if (timeError) return { error: timeError };
  }

  const rows: NewShiftRow[] = [];
  for (const date of dates) {
    const heureDebut = sameHours
      ? sharedHeureDebut
      : String(formData.get(`heure_debut_${date}`) || "");
    const heureFin = sameHours
      ? sharedHeureFin
      : String(formData.get(`heure_fin_${date}`) || "");

    // En mode "horaires par jour", un jour décoché n'a pas d'heures
    // renseignées : on le saute simplement au lieu de lever une erreur.
    if (!sameHours && !heureDebut && !heureFin) {
      continue;
    }

    const timeError = validateTimes(heureDebut, heureFin);
    if (timeError) return { error: `${timeError} (${date})` };

    rows.push({
      date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      lieu,
      poste,
      extra_id: extraId,
      statut,
      cree_par: userId,
    });
  }

  if (rows.length === 0) {
    return { error: "Sélectionnez au moins un jour." };
  }

  const supabase = await createClient();
  const { data: shifts, error } = await supabase
    .from("shifts")
    .insert(rows)
    .select("id, date, heure_debut, heure_fin, lieu, poste");

  if (error || !shifts || shifts.length === 0) {
    return { error: "Impossible de créer ces créneaux." };
  }

  await notifyShiftsAssigned(extraId, shifts);

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createShift(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const mode = String(formData.get("mode") || "single");
  if (mode === "range") {
    return createShiftRange(user.id, formData);
  }

  const fields = readShiftFields(formData);
  const validationError = validateShift(fields);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const { data: shift, error } = await supabase
    .from("shifts")
    .insert({ ...fields, cree_par: user.id })
    .select("id, date, heure_debut, heure_fin, lieu, poste")
    .single();

  if (error || !shift) {
    return { error: "Impossible de créer ce créneau." };
  }

  await notifyShiftsAssigned(fields.extra_id, [shift]);

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateShift(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const fields = readShiftFields(formData);
  const validationError = validateShift(fields);
  if (!id || validationError) {
    return { error: validationError || "Créneau invalide." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("shifts")
    .update(fields)
    .eq("id", id);

  if (error) {
    return { error: "Impossible de modifier ce créneau." };
  }

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelShift(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ statut: "annule" satisfies ShiftStatus })
    .eq("id", id);

  if (error) {
    return { error: "Impossible d'annuler ce créneau." };
  }

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteShift(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("shifts").delete().eq("id", id);

  if (error) {
    return { error: "Impossible de supprimer ce créneau." };
  }

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
  return { success: true };
}
