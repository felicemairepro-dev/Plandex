import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { JoinFlow } from "@/components/join/JoinFlow";

export default function RejoindrePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/5 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4" />
          <h1 className="text-2xl font-semibold text-foreground">
            Créer mon compte extra
          </h1>
          <p className="mt-1 text-sm text-muted">
            Saisissez le code d&apos;invitation fourni par votre
            administrateur.
          </p>
        </div>

        <JoinFlow />

        <p className="mt-6 text-center text-sm text-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            Connectez-vous
          </Link>
        </p>
      </div>
    </main>
  );
}
