"use client";

import { useActionState } from "react";
import { updateOwnProfile } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionResult, Profile } from "@/lib/types";

const initialState: ActionResult = {};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(
    updateOwnProfile,
    initialState
  );

  const [firstName, ...rest] = (profile.full_name ?? "").split(" ");
  const lastName = rest.join(" ");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="firstName"
          name="firstName"
          label="Prénom"
          defaultValue={firstName}
          required
        />
        <Input
          id="lastName"
          name="lastName"
          label="Nom"
          defaultValue={lastName}
          required
        />
      </div>
      <Input id="email" label="Email" value={profile.email ?? ""} disabled />
      <Input
        id="phone"
        name="phone"
        type="tel"
        label="Téléphone"
        defaultValue={profile.phone ?? ""}
      />

      {state.error && (
        <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl bg-success-bg px-3.5 py-2.5 text-sm text-success">
          Vos informations ont été mises à jour.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
