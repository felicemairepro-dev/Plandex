import { timeToMinutes, toISODate } from "@/lib/date-utils";
import type { Shift, TimeEntry } from "@/lib/types";

export type ShiftPhase = "avenir" | "encours" | "termine";

export const SHIFT_PHASE_LABELS: Record<ShiftPhase, string> = {
  avenir: "À venir",
  encours: "En cours",
  termine: "Terminé",
};

/**
 * Avancement d'un créneau. Priorité au pointage réel de l'extra quand il
 * est disponible (arrivée pointée => en cours, départ pointé => terminé) ;
 * sinon on se base sur la date/heure prévue du créneau.
 */
export function getShiftProgressPhase(
  shift: Pick<Shift, "date" | "heure_debut" | "heure_fin">,
  now: Date,
  entry?: Pick<TimeEntry, "heure_arrivee" | "heure_depart"> | null
): ShiftPhase {
  if (entry?.heure_depart) return "termine";
  if (entry?.heure_arrivee) return "encours";

  const todayISO = toISODate(now);
  if (shift.date < todayISO) return "termine";
  if (shift.date > todayISO) return "avenir";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(shift.heure_debut);
  const end = timeToMinutes(shift.heure_fin);
  if (nowMinutes < start) return "avenir";
  return nowMinutes < end ? "avenir" : "termine";
}
