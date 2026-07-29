"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { InviteCodeStep } from "@/components/join/InviteCodeStep";
import { SignUpStep } from "@/components/join/SignUpStep";

export function JoinFlow() {
  const [code, setCode] = useState<string | null>(null);

  return (
    <Card>
      {code ? (
        <SignUpStep code={code} />
      ) : (
        <InviteCodeStep onValid={setCode} />
      )}
    </Card>
  );
}
