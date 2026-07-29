"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/dashboard/planning", label: "Planning" },
  { href: "/dashboard/team", label: "Équipe" },
];

export function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  if (!isAdmin) return null;

  return (
    <nav className="flex items-center gap-1">
      {ADMIN_LINKS.map((link) => {
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
              active
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-background hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
