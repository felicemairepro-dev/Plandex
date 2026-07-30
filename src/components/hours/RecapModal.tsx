"use client";

import { Modal } from "@/components/ui/Modal";
import { RecapView } from "@/components/hours/RecapView";
import type { Payment, Profile, TimeEntryWithShift } from "@/lib/types";

export function RecapModal({
  extra,
  entries,
  payments,
  onClose,
}: {
  extra: Profile;
  entries: TimeEntryWithShift[];
  payments?: Payment[];
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <RecapView
        extra={extra}
        entries={entries}
        payments={payments}
        onClose={onClose}
      />
    </Modal>
  );
}
