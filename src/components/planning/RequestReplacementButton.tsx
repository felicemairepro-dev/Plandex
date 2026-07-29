"use client";

import { useState, useTransition } from "react";
import { requestReplacement } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/Button";
import type { Shift } from "@/lib/types";

export function RequestReplacementButton({ shift }: { shift: Shift }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(shift.remplacement_demande);

  if (requested) {
    return (
      <p className="mt-4 border-t border-border pt-4 text-sm text-muted">
        Demande de remplacement envoyée à l&apos;administrateur.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {error && (
        <p className="mb-2 rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      <Button
        variant="secondary"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await requestReplacement(shift.id);
            if (result.error) {
              setError(result.error);
              return;
            }
            setRequested(true);
          })
        }
      >
        Demander un remplacement
      </Button>
    </div>
  );
}
