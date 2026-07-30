import type { ShiftStatus } from "@/lib/types";

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  propose: "Proposé",
  confirme: "Confirmé",
  annule: "Annulé",
};

export const SHIFT_STATUS_BADGE: Record<
  ShiftStatus,
  "success" | "warning" | "neutral" | "danger"
> = {
  confirme: "success",
  propose: "warning",
  annule: "danger",
};
