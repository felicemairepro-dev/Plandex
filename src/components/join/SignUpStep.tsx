"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpExtra, type SignUpResult } from "@/app/rejoindre/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: SignUpResult = {};

export function SignUpStep({ code }: { code: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    signUpExtra,
    initialState
  );

  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state.success && !state.needsConfirmation) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  if (state.success && state.needsConfirmation) {
    return (
      <p className="text-sm text-foreground">
        Votre compte a été créé. Vérifiez vos emails pour confirmer votre
        adresse avant de vous connecter.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="code" value={code} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="firstName" name="firstName" label="Prénom" required />
        <Input id="lastName" name="lastName" label="Nom" required />
      </div>
      <Input id="email" name="email" type="email" label="Email" required />
      <Input id="phone" name="phone" type="tel" label="Téléphone" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="password"
          name="password"
          type="password"
          label="Mot de passe"
          autoComplete="new-password"
          required
        />
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirmer"
          autoComplete="new-password"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} className="w-full">
        Créer mon compte
      </Button>
    </form>
  );
}
