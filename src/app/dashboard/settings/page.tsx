import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/get-profile";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";

export default async function SettingsPage() {
  const { user, profile } = await getProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Réglages</h1>
        <p className="mt-1 text-sm text-muted">
          Vos informations personnelles et votre mot de passe.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Informations personnelles
        </h2>
        <div className="mt-4">
          <ProfileForm profile={profile} />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Mot de passe
        </h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </Card>
    </div>
  );
}
