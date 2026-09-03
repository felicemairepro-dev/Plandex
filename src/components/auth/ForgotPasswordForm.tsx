"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
      }
    );

    setLoading(false);

    if (resetError) {
      console.error("resetPasswordForEmail failed:", resetError);
      setError("Une erreur est survenue. Réessayez dans un instant.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-foreground">
          Si un compte existe pour <strong>{email}</strong>, un email de
          réinitialisation vient de vous être envoyé.
        </p>
        <Link
          href="/login"
          className="text-sm text-accent transition-colors hover:text-accent-hover"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        id="email"
        type="email"
        label="Email"
        autoComplete="email"
        placeholder="vous@exemple.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {error && (
        <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Envoyer le lien de réinitialisation
      </Button>

      <Link
        href="/login"
        className="text-center text-sm text-muted transition-colors hover:text-accent"
      >
        Retour à la connexion
      </Link>
    </form>
  );
}
