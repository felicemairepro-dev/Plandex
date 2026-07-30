import { timeToMinutes } from "@/lib/date-utils";
import type { Shift } from "@/lib/types";

export function isShiftActiveNow(
  shift: Pick<Shift, "date" | "heure_debut" | "heure_fin" | "statut">,
  now: Date
) {
  if (shift.statut === "annule") return false;
  const todayISO = now.toISOString().slice(0, 10);
  if (shift.date !== todayISO) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(shift.heure_debut);
  const end = timeToMinutes(shift.heure_fin);
  return nowMinutes >= start && nowMinutes < end;
}

export function shiftDurationHours(heureDebut: string, heureFin: string) {
  return Math.max(0, (timeToMinutes(heureFin) - timeToMinutes(heureDebut)) / 60);
}
