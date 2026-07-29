import { Card } from "@/components/ui/Card";
import { ExtraRow } from "@/components/team/ExtraRow";
import type { Profile, TimeEntryWithShift } from "@/lib/types";

export function TeamList({
  extras,
  historyByExtraId,
}: {
  extras: Profile[];
  historyByExtraId: Record<string, TimeEntryWithShift[]>;
}) {
  return (
    <Card>
      {extras.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Aucun extra pour le moment.
        </p>
      ) : (
        extras.map((extra) => (
          <ExtraRow
            key={extra.id}
            extra={extra}
            history={historyByExtraId[extra.id] ?? []}
          />
        ))
      )}
    </Card>
  );
}
