"use client";

import { useActionState, useState, useTransition } from "react";
import { updateExtra, toggleExtraActive } from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { ActionResult, Profile } from "@/lib/types";

const initialState: ActionResult = {};

export function ExtraRow({ extra }: { extra: Profile }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateExtra,
    initialState
  );
  const [togglePending, startToggle] = useTransition();

  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state.success) setEditing(false);
  }

  const [firstName, ...rest] = (extra.full_name ?? "").split(" ");
  const lastName = rest.join(" ");

  if (editing) {
    return (
      <div className="flex flex-col gap-4 border-b border-border py-5 last:border-none">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={extra.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id={`firstName-${extra.id}`}
              name="firstName"
              label="Prénom"
              defaultValue={firstName}
              required
            />
            <Input
              id={`lastName-${extra.id}`}
              name="lastName"
              label="Nom"
              defaultValue={lastName}
              required
            />
          </div>
          <Input
            id={`phone-${extra.id}`}
            name="phone"
            type="tel"
            label="Téléphone"
            defaultValue={extra.phone ?? ""}
          />

          {state.error && (
            <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5 last:border-none">
      <div>
        <p className="font-medium text-foreground">
          {extra.full_name || "Sans nom"}
        </p>
        <p className="text-sm text-muted">{extra.email}</p>
        {extra.phone && <p className="text-sm text-muted">{extra.phone}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={extra.actif ? "success" : "neutral"}>
          {extra.actif ? "Actif" : "Inactif"}
        </Badge>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Modifier
        </Button>
        <Button
          variant="secondary"
          loading={togglePending}
          onClick={() =>
            startToggle(async () => {
              await toggleExtraActive(extra.id, !extra.actif);
            })
          }
        >
          {extra.actif ? "Désactiver" : "Réactiver"}
        </Button>
      </div>
    </div>
  );
}
