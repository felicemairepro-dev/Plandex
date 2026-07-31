import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/get-profile";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ExtraDashboardTabs } from "@/components/dashboard/ExtraDashboardTabs";
import { isShiftActiveNow, shiftDurationHours } from "@/lib/kpi";
import { estimateAmount, formatHoursLabel } from "@/lib/monthly-recap";
import type {
  Shift,
  ShiftWithExtra,
  TimeEntry,
  TimeEntryWithShift,
} from "@/lib/types";

export default async function DashboardPage() {
  const { user, profile } = await getProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  const firstName = profile.full_name?.split(" ")[0] || user.email;

  if (profile.role === "admin") {
    const supabase = await createClient();
    const [{ data: extras }, { data: shifts }, { data: entries }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, taux_horaire")
          .eq("role", "extra")
          .returns<{ id: string; taux_horaire: number | null }[]>(),
        supabase
          .from("shifts")
          .select("date, heure_debut, heure_fin, extra_id, statut")
          .returns<
            Pick<Shift, "date" | "heure_debut" | "heure_fin" | "extra_id" | "statut">[]
          >(),
        supabase
          .from("time_entries")
          .select("extra_id, heure_arrivee, heure_depart")
          .returns<
            Pick<TimeEntry, "extra_id" | "heure_arrivee" | "heure_depart">[]
          >(),
      ]);

    const tauxHoraireByExtraId = new Map(
      (extras ?? []).map((e) => [e.id, e.taux_horaire])
    );

    const now = new Date();
    const activeShiftsNow = (shifts ?? []).filter((s) =>
      isShiftActiveNow(s, now)
    ).length;

    let totalWorkedMinutes = 0;
    let realCost = 0;
    for (const entry of entries ?? []) {
      if (!entry.heure_arrivee || !entry.heure_depart) continue;
      const diff =
        new Date(entry.heure_depart).getTime() -
        new Date(entry.heure_arrivee).getTime();
      if (diff <= 0) continue;
      const minutes = Math.round(diff / 60000);
      totalWorkedMinutes += minutes;
      const taux = tauxHoraireByExtraId.get(entry.extra_id);
      if (taux != null) realCost += (minutes / 60) * taux;
    }

    const totalCost = (shifts ?? [])
      .filter((s) => s.statut !== "annule")
      .reduce((sum, s) => {
        const taux = tauxHoraireByExtraId.get(s.extra_id);
        if (taux == null) return sum;
        return sum + shiftDurationHours(s.heure_debut, s.heure_fin) * taux;
      }, 0);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Bienvenue, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Voici un aperçu de votre activité.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Équipiers"
            value={String((extras ?? []).length)}
            href="/dashboard/team"
          />
          <KpiCard
            label="En poste en ce moment"
            value={String(activeShiftsNow)}
            href="/dashboard/planning"
          />
          <KpiCard
            label="Heures effectuées (total)"
            value={formatHoursLabel(totalWorkedMinutes)}
            href="/dashboard/hours"
          />
          <KpiCard
            label="Coûts réels"
            value={`${realCost.toFixed(2)} €`}
            href="/dashboard/hours"
            hint="Basé sur les heures déjà effectuées et validées"
          />
          <KpiCard
            label="Coût prévisionnel total"
            value={`${totalCost.toFixed(2)} €`}
            href="/dashboard/hours"
            hint="Basé sur les créneaux planifiés et les taux horaires"
          />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: shifts }, { data: timeEntries }] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "id, date, heure_debut, heure_fin, lieu, poste, extra_id, statut, cree_par, cree_le"
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

  const workedMinutes = (timeEntries ?? []).reduce((sum, entry) => {
    if (!entry.heure_arrivee || !entry.heure_depart) return sum;
    const diff =
      new Date(entry.heure_depart).getTime() -
      new Date(entry.heure_arrivee).getTime();
    return diff > 0 ? sum + Math.round(diff / 60000) : sum;
  }, 0);

  const upcomingMinutes = (shifts ?? [])
    .filter((shift) => {
      if (shift.statut === "annule") return false;
      const entry = entriesByShiftId[shift.id];
      return !entry || !entry.heure_depart;
    })
    .reduce(
      (sum, shift) =>
        sum + shiftDurationHours(shift.heure_debut, shift.heure_fin) * 60,
      0
    );

  const completedEntries = (timeEntries ?? []).filter(
    (entry) => entry.heure_arrivee && entry.heure_depart
  );
  const joursTravailles = new Set(
    completedEntries.map((entry) => entry.shift?.date).filter(Boolean)
  ).size;

  const argentAPercevoir = estimateAmount(workedMinutes, profile.taux_horaire);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Bienvenue, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted">Voici votre espace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Heures déjà effectuées"
          value={formatHoursLabel(workedMinutes)}
          href="/dashboard/hours"
        />
        <KpiCard
          label="Heures prévisionnelles"
          value={formatHoursLabel(upcomingMinutes)}
          href="/dashboard/planning"
          hint="Créneaux restant à faire"
        />
        <KpiCard
          label="Jours travaillés"
          value={String(joursTravailles)}
          href="/dashboard/hours"
        />
        <KpiCard
          label="Argent à percevoir"
          value={
            workedMinutes === 0
              ? "—"
              : argentAPercevoir != null
                ? `${argentAPercevoir.toFixed(2)} €`
                : "Taux non renseigné"
          }
          href="/dashboard/hours"
          hint="Basé sur les heures déjà effectuées — indicatif, paiement en dehors de l'application"
        />
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
