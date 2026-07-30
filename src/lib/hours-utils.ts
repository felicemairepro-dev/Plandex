import { timeToMinutes } from "@/lib/date-utils";
import type { TimeEntryWithShift } from "@/lib/types";

// Tolérance avant qu'une arrivée soit considérée en retard (ex: prévu 9h00,
// pointé jusqu'à 9h10 = à l'heure).
export const LATE_THRESHOLD_MINUTES = 10;

export function formatLocalTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function computeLateMinutes(
  heureDebut: string,
  heureArrivee: string | null
) {
  if (!heureArrivee) return null;
  const scheduled = timeToMinutes(heureDebut);
  const actualDate = new Date(heureArrivee);
  const actual = actualDate.getHours() * 60 + actualDate.getMinutes();
  return actual - scheduled;
}

export function getLateMinutes(entry: TimeEntryWithShift) {
  if (!entry.shift) return null;
  return computeLateMinutes(entry.shift.heure_debut, entry.heure_arrivee);
}

export function getDurationLabel(entry: TimeEntryWithShift) {
  if (!entry.heure_arrivee || !entry.heure_depart) return "—";
  const diffMin = Math.round(
    (new Date(entry.heure_depart).getTime() -
      new Date(entry.heure_arrivee).getTime()) /
      60000
  );
  if (diffMin < 0) return "—";
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}
