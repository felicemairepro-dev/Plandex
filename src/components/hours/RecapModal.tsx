"use client";

import { Modal } from "@/components/ui/Modal";
import { RecapView } from "@/components/hours/RecapView";
import type { Profile, TimeEntryWithShift } from "@/lib/types";

export function RecapModal({
  extra,
  entries,
  onClose,
}: {
  extra: Profile;
  entries: TimeEntryWithShift[];
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <RecapView extra={extra} entries={entries} onClose={onClose} />
    </Modal>
  );
}
