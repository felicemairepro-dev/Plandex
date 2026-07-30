"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getInitials(fullName: string | null, email: string | null) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    if (initials) return initials;
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function ProfileMenu({
  fullName,
  email,
}: {
  fullName: string | null;
  email: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Menu profil"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent/20"
      >
        {getInitials(fullName, email)}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">
              {fullName || "Mon compte"}
            </p>
            {email && <p className="truncate text-xs text-muted">{email}</p>}
          </div>
          <Link
            href="/dashboard/settings"
            className="block px-4 py-2.5 text-sm text-foreground transition-colors duration-200 hover:bg-background"
          >
            Réglages
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="block w-full px-4 py-2.5 text-left text-sm text-danger transition-colors duration-200 hover:bg-danger-bg disabled:opacity-60"
          >
            {loading ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
      )}
    </div>
  );
}
