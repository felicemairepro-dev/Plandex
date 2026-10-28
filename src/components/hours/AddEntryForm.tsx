"use client";

import { useActionState, useState } from "react";
import { createTimeEntry } from "@/app/dashboard/hours/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult, ShiftWithExtra } from "@/lib/types";

const initialState: ActionResult = {};

export function AddEntryForm({
  shift,
  onDone,
}: {
  shift: ShiftWithExtra;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createTimeEntry,
    initialState
  );

  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state.success) onDone();
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-foreground">
        Ajouter un pointage
      </h2>
      <p className="mt-1 text-sm text-muted">
        {shift.extra?.full_name || "Équipier"} · {shift.date} · {shift.poste}
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="shiftId" value={shift.id} />
        <input type="hidden" name="extraId" value={shift.extra_id} />
        <input type="hidden" name="date" value={shift.date} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="add_heure_arrivee"
            name="heure_arrivee"
            type="time"
            label="Heure d'arrivée"
          />
          <Input
            id="add_heure_depart"
            name="heure_depart"
            type="time"
            label="Heure de départ"
          />
        </div>

        <p className="text-xs text-muted">
          Ce pointage sera marqué comme saisi manuellement par un
          administrateur.
        </p>

        {state.error && (
          <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
            {state.error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onDone}>
            Annuler
          </Button>
          <Button type="submit" loading={pending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Card>
  );
}
