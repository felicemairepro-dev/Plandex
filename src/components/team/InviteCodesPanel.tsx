"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateInviteCode } from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { InviteCode } from "@/lib/types";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function InviteCodesPanel({ codes }: { codes: InviteCode[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [justGenerated, setJustGenerated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateInviteCode();
      if (result.error || !result.code) {
        setError(result.error || "Une erreur est survenue.");
        return;
      }
      setJustGenerated(result.code.code);
      setCopied(false);
      router.refresh();
    });
  }

  async function handleCopy() {
    if (!justGenerated) return;
    await navigator.clipboard.writeText(justGenerated);
    setCopied(true);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Codes d&apos;invitation
          </h2>
          <p className="mt-1 text-sm text-muted">
            Transmettez un code à un extra pour qu&apos;il crée son compte sur{" "}
            <span className="font-medium text-foreground">/rejoindre</span>.
          </p>
        </div>
        <Button loading={pending} onClick={handleGenerate}>
          Générer un code
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {justGenerated && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <span className="font-mono text-base font-semibold tracking-wide text-accent">
            {justGenerated}
          </span>
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? "Copié !" : "Copier"}
          </Button>
        </div>
      )}

      {codes.length > 0 && (
        <div className="mt-6">
          {codes.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-none"
            >
              <span className="font-mono text-sm text-foreground">
                {c.code}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">
                  {formatDate(c.cree_le)}
                </span>
                <Badge variant={c.utilise ? "neutral" : "warning"}>
                  {c.utilise ? "Utilisé" : "En attente"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
