import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/get-profile";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LogoutButton } from "@/components/auth/LogoutButton";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-foreground">
              Plandex
            </span>
            <DashboardNav isAdmin={isAdmin} />
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
