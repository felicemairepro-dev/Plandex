import { timeToMinutes, toISODate } from "@/lib/date-utils";
import type { Shift } from "@/lib/types";

export type ShiftPhase = "avenir" | "encours" | "termine";

export const SHIFT_PHASE_LABELS: Record<ShiftPhase, string> = {
  avenir: "À venir",
  encours: "En cours",
  termine: "Terminé",
};

export function getShiftProgressPhase(
  shift: Pick<Shift, "date" | "heure_debut" | "heure_fin">,
  now: Date
): ShiftPhase {
  const todayISO = toISODate(now);
  if (shift.date < todayISO) return "termine";
  if (shift.date > todayISO) return "avenir";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(shift.heure_debut);
  const end = timeToMinutes(shift.heure_fin);
  if (nowMinutes < start) return "avenir";
  if (nowMinutes < end) return "encours";
  return "termine";
}
