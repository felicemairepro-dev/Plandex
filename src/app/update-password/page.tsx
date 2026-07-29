import { Card } from "@/components/ui/Card";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/5 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Nouveau mot de passe
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choisissez un mot de passe sécurisé
          </p>
        </div>

        <Card>
          <UpdatePasswordForm />
        </Card>
      </div>
    </main>
  );
}
