import { Card } from "@/components/ui/Card";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/5 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-muted">
            Recevez un lien par email pour le réinitialiser
          </p>
        </div>

        <Card>
          <ForgotPasswordForm />
        </Card>
      </div>
    </main>
  );
}
