"use client";

import { useActionState, useState } from "react";
import { inviteExtra } from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/types";

const initialState: ActionResult = {};

export function AddExtraForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    inviteExtra,
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
        Ajouter un extra
      </h2>
      <p className="mt-1 text-sm text-muted">
        Un email d&apos;invitation lui sera envoyé pour définir son mot de
        passe.
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="firstName" name="firstName" label="Prénom" required />
          <Input id="lastName" name="lastName" label="Nom" required />
        </div>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          required
        />
        <Input id="phone" name="phone" type="tel" label="Téléphone" />

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
            Envoyer l&apos;invitation
          </Button>
        </div>
      </form>
    </Card>
  );
}
