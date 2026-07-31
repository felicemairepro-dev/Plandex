"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

export function DashboardLogoLink() {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/dashboard") return;
    // Un Link vers la page déjà affichée ne déclenche aucune navigation :
    // on force donc manuellement le retour en haut et le rafraîchissement.
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.refresh();
  }

  return (
    <Link href="/dashboard" className="shrink-0" onClick={handleClick}>
      <Logo />
    </Link>
  );
}
