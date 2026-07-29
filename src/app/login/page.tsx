import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/5 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4" />
          <h1 className="text-2xl font-semibold text-foreground">
            Bienvenue
          </h1>
          <p className="mt-1 text-sm text-muted">
            Connectez-vous pour accéder à votre planning
          </p>
        </div>

        <Card>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
