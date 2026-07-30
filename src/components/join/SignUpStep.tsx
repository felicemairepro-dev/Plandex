"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpExtra, type SignUpResult } from "@/app/rejoindre/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

const initialState: SignUpResult = {};

export function SignUpStep({ code }: { code: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    signUpExtra,
    initialState
  );

  // Champs contrôlés pour survivre à une erreur de soumission : React
  // réinitialise les champs non contrôlés du formulaire après chaque
  // appel de action, y compris en cas d'erreur. On ne veut ça que pour
  // les mots de passe (volontairement vidés ci-dessous).
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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
        <Input
          id="firstName"
          name="firstName"
          label="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <Input
          id="lastName"
          name="lastName"
          label="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="phone"
        name="phone"
        type="tel"
        label="Téléphone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordInput
          id="password"
          name="password"
          label="Mot de passe"
          autoComplete="new-password"
          hint="8 caractères minimum"
          required
        />
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
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
