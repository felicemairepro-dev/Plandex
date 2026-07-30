import { getProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import { withPaymentColumnFallback } from "@/lib/supabase/time-entries";
import { Card } from "@/components/ui/Card";
import { TeamList } from "@/components/team/TeamList";
import { InviteCodesPanel } from "@/components/team/InviteCodesPanel";
import type { InviteCode, Profile, TimeEntryWithShift } from "@/lib/types";

export default async function TeamPage() {
  const { profile } = await getProfile();

  if (profile?.role !== "admin") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-semibold text-foreground">
          Accès refusé
        </h1>
        <p className="mt-2 text-sm text-muted">
          Cette page est réservée aux administrateurs.
        </p>
      </Card>
    );
  }

  const supabase = await createClient();

  const [{ data: extras }, { data: codes }, { data: timeEntries }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, actif, taux_horaire")
        .eq("role", "extra")
        .order("full_name")
        .returns<Profile[]>(),
      supabase
        .from("invite_codes")
        .select("id, code, utilise, cree_par, cree_le, expire_le")
        .order("cree_le", { ascending: false })
        .returns<InviteCode[]>(),
      withPaymentColumnFallback<TimeEntryWithShift>(
        "id, shift_id, extra_id, heure_arrivee, heure_depart, corrige_par_admin, cree_le, shift:shifts(date, heure_debut, heure_fin, poste, lieu)",
        (select) =>
          supabase
            .from("time_entries")
            .select(select)
            .order("cree_le", { ascending: false })
            .returns<TimeEntryWithShift[]>()
      ).then(({ data }) => ({ data })),
    ]);

  const historyByExtraId = new Map<string, TimeEntryWithShift[]>();
  for (const entry of timeEntries ?? []) {
    const list = historyByExtraId.get(entry.extra_id) ?? [];
    list.push(entry);
    historyByExtraId.set(entry.extra_id, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Équipe</h1>
        <p className="mt-1 text-sm text-muted">
          Gérez les comptes de vos extras et indépendants.
        </p>
      </div>

      <InviteCodesPanel codes={codes ?? []} />
      <TeamList
        extras={extras ?? []}
        historyByExtraId={Object.fromEntries(historyByExtraId)}
      />
    </div>
  );
}
