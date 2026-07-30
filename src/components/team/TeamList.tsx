import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExtraRow } from "@/components/team/ExtraRow";
import type { Payment, Profile, TimeEntryWithShift } from "@/lib/types";

export function TeamList({
  extras,
  historyByExtraId,
  paymentsByExtraId,
}: {
  extras: Profile[];
  historyByExtraId: Record<string, TimeEntryWithShift[]>;
  paymentsByExtraId: Record<string, Payment[]>;
}) {
  return (
    <Card>
      {extras.length === 0 ? (
        <EmptyState
          title="Aucun extra pour le moment"
          description="Générez un code d'invitation ci-dessus pour ajouter votre premier extra."
        />
      ) : (
        extras.map((extra) => (
          <ExtraRow
            key={extra.id}
            extra={extra}
            history={historyByExtraId[extra.id] ?? []}
            payments={paymentsByExtraId[extra.id] ?? []}
          />
        ))
      )}
    </Card>
  );
}
