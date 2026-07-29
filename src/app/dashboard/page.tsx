import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/get-profile";
import { Card } from "@/components/ui/Card";
import { ExtraDashboardTabs } from "@/components/dashboard/ExtraDashboardTabs";
import type { Shift, ShiftWithExtra, TimeEntry, TimeEntryWithShift } from "@/lib/types";

export default async function DashboardPage() {
  const { user, profile } = await getProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  const firstName = profile.full_name?.split(" ")[0] || user.email;

  if (profile.role === "admin") {
    return (
      <Card>
        <h1 className="text-2xl font-semibold text-foreground">
          Bienvenue, {firstName}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Retrouvez votre équipe et le planning dans le menu ci-dessus.
        </p>
      </Card>
    );
  }

  const supabase = await createClient();
  const [{ data: shifts }, { data: timeEntries }] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "id, date, heure_debut, heure_fin, lieu, poste, extra_id, statut, cree_par, cree_le, remplacement_demande"
      )
      .eq("extra_id", user.id)
      .order("date")
      .order("heure_debut")
      .returns<Shift[]>(),
    supabase
      .from("time_entries")
      .select(
        "id, shift_id, extra_id, heure_arrivee, heure_depart, corrige_par_admin, cree_le, shift:shifts(date, heure_debut, heure_fin, poste, lieu)"
      )
      .eq("extra_id", user.id)
      .returns<TimeEntryWithShift[]>(),
  ]);

  const entriesByShiftId: Record<string, TimeEntry> = {};
  for (const entry of timeEntries ?? []) {
    entriesByShiftId[entry.shift_id] = entry;
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (shifts ?? []).filter((shift) => shift.date >= today);
  const past = (shifts ?? [])
    .filter((shift) => shift.date < today)
    .reverse();

  const calendarShifts: ShiftWithExtra[] = (shifts ?? []).map((shift) => ({
    ...shift,
    extra: null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Bienvenue, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted">Voici votre espace.</p>
      </div>

      <ExtraDashboardTabs
        profile={profile}
        upcoming={upcoming}
        past={past}
        entriesByShiftId={entriesByShiftId}
        calendarShifts={calendarShifts}
        recapEntries={timeEntries ?? []}
        today={today}
      />
    </div>
  );
}
