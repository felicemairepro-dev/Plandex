import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { Profile } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single<Profile>();

  const firstName = profile?.full_name?.split(" ")[0] ?? user.email;
  const spaceLabel =
    profile?.role === "admin" ? "Espace Administrateur" : "Mon espace";

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            {spaceLabel}
          </span>
          <LogoutButton />
        </header>

        <Card>
          <h1 className="text-2xl font-semibold text-foreground">
            Bienvenue, {firstName}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Votre tableau de bord est prêt. Les prochaines fonctionnalités
            (planning, badgage) apparaîtront ici.
          </p>
        </Card>
      </div>
    </main>
  );
}
