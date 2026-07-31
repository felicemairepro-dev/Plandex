import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardLogoLink } from "@/components/dashboard/DashboardLogoLink";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ProfileMenu } from "@/components/dashboard/ProfileMenu";
import type { Notification } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getProfile();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = profile?.role === "admin";

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, user_id, message, lu, cree_le")
    .order("cree_le", { ascending: false })
    .limit(30)
    .returns<Notification[]>();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <DashboardLogoLink />
            <div className="min-w-0 overflow-x-auto">
              <DashboardNav isAdmin={isAdmin} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell notifications={notifications ?? []} />
            <ProfileMenu
              fullName={profile?.full_name ?? null}
              email={profile?.email ?? user.email ?? null}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
