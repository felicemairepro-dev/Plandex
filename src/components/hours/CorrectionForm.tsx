"use client";

import { useActionState, useState } from "react";
import { correctTimeEntry } from "@/app/dashboard/hours/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult, TimeEntryWithShift } from "@/lib/types";

const initialState: ActionResult = {};

function toLocalTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CorrectionForm({
  entry,
  onDone,
}: {
  entry: TimeEntryWithShift;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    correctTimeEntry,
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
        Corriger le pointage
      </h2>
      <p className="mt-1 text-sm text-muted">
        {entry.extra?.full_name} · {entry.shift?.date}
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <input type="hidden" name="id" value={entry.id} />
        <input type="hidden" name="date" value={entry.shift?.date} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="heure_arrivee"
            name="heure_arrivee"
            type="time"
            label="Heure d'arrivée"
            defaultValue={toLocalTime(entry.heure_arrivee)}
          />
          <Input
            id="heure_depart"
            name="heure_depart"
            type="time"
            label="Heure de départ"
            defaultValue={toLocalTime(entry.heure_depart)}
          />
        </div>

        <p className="text-xs text-muted">
          Cette correction sera marquée comme effectuée manuellement par un
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
