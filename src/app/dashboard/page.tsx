import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/get-profile";
import { Card } from "@/components/ui/Card";
import { ExtraShiftCard } from "@/components/planning/ExtraShiftCard";
import type { Shift } from "@/lib/types";

export default async function DashboardPage() {
  const { user, profile } = await getProfile();

  if (!user) {
    redirect("/login");
  }

  const firstName = profile?.full_name?.split(" ")[0] || user.email;

  if (profile?.role === "admin") {
    return (
      <Card>
        <h1 className="text-2xl font-semibold text-foreground">
          Bienvenue, {firstName}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Retrouvez votre équipe et le planning dans le menu ci-dessus.
        </p>
      </Card>
    );
  }

  const supabase = await createClient();
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, date, heure_debut, heure_fin, lieu, poste, extra_id, statut, cree_par, cree_le")
    .eq("extra_id", user.id)
    .order("date")
    .order("heure_debut")
    .returns<Shift[]>();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (shifts ?? []).filter((shift) => shift.date >= today);
  const past = (shifts ?? [])
    .filter((shift) => shift.date < today)
    .reverse();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Bienvenue, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted">Voici votre planning.</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          À venir
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Aucun créneau à venir.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((shift) => (
              <ExtraShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Passés
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((shift) => (
              <ExtraShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
