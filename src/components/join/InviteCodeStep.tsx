"use client";

import { useActionState, useState } from "react";
import { checkInviteCode } from "@/app/rejoindre/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/types";

const initialState: ActionResult = {};

export function InviteCodeStep({
  onValid,
}: {
  onValid: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [state, formAction, pending] = useActionState(
    checkInviteCode,
    initialState
  );

  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state.success) onValid(code.trim().toUpperCase());
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        id="code"
        name="code"
        label="Code d'invitation"
        placeholder="PLDX-XXXX"
        autoComplete="off"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />

      {state.error && (
        <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} className="w-full">
        Continuer
      </Button>
    </form>
  );
}
