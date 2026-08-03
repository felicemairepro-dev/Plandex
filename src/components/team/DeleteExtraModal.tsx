"use client";

import { useState, useTransition } from "react";
import { deleteExtra } from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

type Step = "confirm" | "choose";

export function DeleteExtraModal({
  extraId,
  extraName,
  onClose,
  onDeleted,
}: {
  extraId: string;
  extraName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(keepHours: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await deleteExtra(extraId, keepHours);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <Modal onClose={onClose}>
      <Card>
        {step === "confirm" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">
              Supprimer {extraName} ?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Il perdra immédiatement l&apos;accès à son compte. Il pourra se
              recréer un compte plus tard avec un nouveau code
              d&apos;invitation.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!border-danger !text-danger"
                onClick={() => setStep("choose")}
              >
                Continuer
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">
              Que faire de ses heures pointées ?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Souhaitez-vous conserver l&apos;historique des heures déjà
              effectuées par {extraName}, ou tout supprimer définitivement
              avec le compte ?
            </p>
            {error && (
              <p className="mt-3 rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={pending}
                onClick={() => handleDelete(true)}
              >
                Garder les heures
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!border-danger !text-danger"
                loading={pending}
                onClick={() => handleDelete(false)}
              >
                Supprimer aussi les heures
              </Button>
            </div>
          </>
        )}
      </Card>
    </Modal>
  );
}
