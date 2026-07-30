import { getProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { HoursTable } from "@/components/hours/HoursTable";
import type { Profile, TimeEntryWithShift } from "@/lib/types";

export default async function HoursPage() {
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

  const [{ data: entries }, { data: extras }] = await Promise.all([
    supabase
      .from("time_entries")
      .select(
        "id, shift_id, extra_id, heure_arrivee, heure_depart, corrige_par_admin, cree_le, paye, paye_le, paye_par, shift:shifts(date, heure_debut, heure_fin, poste, lieu), extra:profiles(id, full_name)"
      )
      .order("cree_le", { ascending: false })
      .returns<TimeEntryWithShift[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, actif, taux_horaire")
      .eq("role", "extra")
      .order("full_name")
      .returns<Profile[]>(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Heures</h1>
        <p className="mt-1 text-sm text-muted">
          Pointages de l&apos;équipe, filtrables par période et par extra.
        </p>
      </div>

      <HoursTable entries={entries ?? []} extras={extras ?? []} />
    </div>
  );
}
