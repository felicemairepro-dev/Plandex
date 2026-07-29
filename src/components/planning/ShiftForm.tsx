"use client";

import { useActionState, useState } from "react";
import { createShift, updateShift } from "@/app/dashboard/planning/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { SHIFT_STATUS_LABELS } from "@/lib/shift-status";
import type { ActionResult, Profile, ShiftWithExtra } from "@/lib/types";

const initialState: ActionResult = {};

export function ShiftForm({
  extras,
  shift,
  onDone,
}: {
  extras: Profile[];
  shift?: ShiftWithExtra;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    shift ? updateShift : createShift,
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
        {shift ? "Modifier le créneau" : "Créer un créneau"}
      </h2>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        {shift && <input type="hidden" name="id" value={shift.id} />}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            id="date"
            name="date"
            type="date"
            label="Date"
            defaultValue={shift?.date}
            required
          />
          <Input
            id="heure_debut"
            name="heure_debut"
            type="time"
            label="Heure de début"
            defaultValue={shift?.heure_debut.slice(0, 5)}
            required
          />
          <Input
            id="heure_fin"
            name="heure_fin"
            type="time"
            label="Heure de fin"
            defaultValue={shift?.heure_fin.slice(0, 5)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="lieu"
            name="lieu"
            label="Lieu"
            defaultValue={shift?.lieu}
            required
          />
          <Input
            id="poste"
            name="poste"
            label="Poste"
            placeholder="Ex: Serveur, Aide cuisine"
            defaultValue={shift?.poste}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="extra_id"
            name="extra_id"
            label="Extra"
            defaultValue={shift?.extra_id}
            required
          >
            <option value="" disabled>
              Sélectionner un extra
            </option>
            {extras.map((extra) => (
              <option key={extra.id} value={extra.id}>
                {extra.full_name || extra.email}
              </option>
            ))}
          </Select>

          <Select
            id="statut"
            name="statut"
            label="Statut"
            defaultValue={shift?.statut || "confirme"}
          >
            {Object.entries(SHIFT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

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
            {shift ? "Enregistrer" : "Créer le créneau"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
