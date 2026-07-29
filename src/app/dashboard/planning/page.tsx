import { getProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { PlanningView } from "@/components/planning/PlanningView";
import type { Profile, ShiftWithExtra } from "@/lib/types";

export default async function PlanningPage() {
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

  const [{ data: shifts }, { data: extras }] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "id, date, heure_debut, heure_fin, lieu, poste, extra_id, statut, cree_par, cree_le, extra:profiles!shifts_extra_id_fkey(id, full_name, email)"
      )
      .order("date")
      .order("heure_debut")
      .returns<ShiftWithExtra[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, actif")
      .eq("role", "extra")
      .eq("actif", true)
      .order("full_name")
      .returns<Profile[]>(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Planning</h1>
        <p className="mt-1 text-sm text-muted">
          Créez et gérez les créneaux de vos extras.
        </p>
      </div>

      <PlanningView shifts={shifts ?? []} extras={extras ?? []} />
    </div>
  );
}
