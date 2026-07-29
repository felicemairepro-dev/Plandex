import { timeToMinutes } from "@/lib/date-utils";
import type { TimeEntryWithShift } from "@/lib/types";

export function formatLocalTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getLateMinutes(entry: TimeEntryWithShift) {
  if (!entry.heure_arrivee || !entry.shift) return null;
  const scheduled = timeToMinutes(entry.shift.heure_debut);
  const actualDate = new Date(entry.heure_arrivee);
  const actual = actualDate.getHours() * 60 + actualDate.getMinutes();
  return actual - scheduled;
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
