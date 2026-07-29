"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-lg font-semibold text-foreground">
        Une erreur est survenue
      </h1>
      <p className="mt-2 text-sm text-muted">
        Impossible de charger cette page pour le moment. Vérifiez votre
        connexion et réessayez.
      </p>
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" onClick={reset}>
          Réessayer
        </Button>
      </div>
    </Card>
  );
}
