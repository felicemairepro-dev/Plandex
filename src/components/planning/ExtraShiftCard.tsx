import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SHIFT_STATUS_BADGE, SHIFT_STATUS_LABELS } from "@/lib/shift-status";
import type { Shift } from "@/lib/types";

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ExtraShiftCard({ shift }: { shift: Shift }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize text-foreground">
            {formatDate(shift.date)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {shift.heure_debut.slice(0, 5)} – {shift.heure_fin.slice(0, 5)}
          </p>
        </div>
        <Badge variant={SHIFT_STATUS_BADGE[shift.statut]}>
          {SHIFT_STATUS_LABELS[shift.statut]}
        </Badge>
      </div>
      <div className="mt-4 flex flex-col gap-1 text-sm text-foreground">
        <p>{shift.poste}</p>
        <p className="text-muted">{shift.lieu}</p>
      </div>
    </Card>
  );
}
