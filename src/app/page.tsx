import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-sand/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center text-center">
        <Logo className="mb-8 scale-125" />

        <h1 className="max-w-md text-3xl font-semibold text-foreground sm:text-4xl">
          Le planning de vos extras, en toute simplicité
        </h1>
        <p className="mt-4 max-w-sm text-base text-muted">
          Plandex centralise les créneaux, l&apos;équipe et les disponibilités
          de vos indépendants — un outil interne, clair et rapide.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition-all duration-200 hover:bg-accent-hover hover:shadow-md sm:w-48"
          >
            Se connecter
          </Link>
          <Link
            href="/rejoindre"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-background hover:shadow-md sm:w-56"
          >
            Créer mon compte extra
          </Link>
        </div>
      </div>
    </main>
  );
}
