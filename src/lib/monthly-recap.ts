import type { TimeEntryWithShift } from "@/lib/types";

export interface RecapSummary {
  extraId: string;
  extraName: string;
  totalMinutes: number;
  shiftsCompleted: number;
  tauxHoraire: number | null;
  montantEstime: number | null;
}

export function formatHoursLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

export function computeEntryMinutes(entry: TimeEntryWithShift) {
  if (!entry.heure_arrivee || !entry.heure_depart) return 0;
  const diff =
    new Date(entry.heure_depart).getTime() -
    new Date(entry.heure_arrivee).getTime();
  return diff > 0 ? Math.round(diff / 60000) : 0;
}

export function estimateAmount(totalMinutes: number, tauxHoraire: number | null) {
  if (tauxHoraire == null) return null;
  return Math.round((totalMinutes / 60) * tauxHoraire * 100) / 100;
}

// Le taux propre au créneau prime sur celui du profil quand il est
// renseigné (ex: un créneau exceptionnel payé à un tarif différent).
export function effectiveTauxHoraire(
  entry: TimeEntryWithShift,
  tauxHoraireByExtraId: Map<string, number | null>
) {
  return entry.shift?.taux_horaire ?? tauxHoraireByExtraId.get(entry.extra_id) ?? null;
}

export function buildRecapByExtra(
  entries: TimeEntryWithShift[],
  tauxHoraireByExtraId: Map<string, number | null>
): RecapSummary[] {
  const map = new Map<string, RecapSummary>();

  for (const entry of entries) {
    const minutes = computeEntryMinutes(entry);
    const existing = map.get(entry.extra_id) ?? {
      extraId: entry.extra_id,
      extraName: entry.extra?.full_name || "—",
      totalMinutes: 0,
      shiftsCompleted: 0,
      tauxHoraire: tauxHoraireByExtraId.get(entry.extra_id) ?? null,
      montantEstime: null,
    };

    if (minutes > 0) {
      existing.totalMinutes += minutes;
      existing.shiftsCompleted += 1;
      const montant = estimateAmount(
        minutes,
        effectiveTauxHoraire(entry, tauxHoraireByExtraId)
      );
      if (montant != null) {
        existing.montantEstime = (existing.montantEstime ?? 0) + montant;
      }
    }
    map.set(entry.extra_id, existing);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.extraName.localeCompare(b.extraName)
  );
}
