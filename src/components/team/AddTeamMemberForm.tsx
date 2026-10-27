"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addTeamMember } from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/types";

const initialState: ActionResult = {};

export function AddTeamMemberForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    addTeamMember,
    initialState
  );

  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state.success) {
      setJustAdded(pendingEmail || "cette adresse");
      setOpen(false);
    }
  }

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
    // Runs once per action resolution — `state` is a fresh object each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Ajouter un équipier
          </h2>
          <p className="mt-1 text-sm text-muted">
            Crée directement son compte — il recevra un email pour choisir
            son mot de passe.
          </p>
        </div>
        <Button
          type="button"
          variant={open ? "secondary" : "primary"}
          onClick={() => {
            setJustAdded(null);
            setOpen((v) => !v);
          }}
        >
          {open ? "Annuler" : "Ajouter un équipier"}
        </Button>
      </div>

      {justAdded && (
        <p className="mt-4 rounded-xl bg-success-bg px-3.5 py-2.5 text-sm text-success">
          Compte créé — un email a été envoyé à{" "}
          <strong>{justAdded}</strong> pour choisir son mot de passe.
        </p>
      )}

      {open && (
        <form
          ref={formRef}
          action={formAction}
          onSubmit={(event) => {
            setPendingEmail(
              String(new FormData(event.currentTarget).get("email") || "")
            );
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="firstName" name="firstName" label="Prénom" required />
            <Input id="lastName" name="lastName" label="Nom" required />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="vous@exemple.com"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="phone" name="phone" type="tel" label="Téléphone" />
            <Input
              id="taux_horaire"
              name="taux_horaire"
              type="number"
              step="0.01"
              min="0"
              label="Taux horaire (€)"
              placeholder="Ex: 15.50"
            />
          </div>

          {state.error && (
            <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Créer le compte
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
