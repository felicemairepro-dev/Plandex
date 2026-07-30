import Link from "next/link";

export function KpiCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="text-3xl font-semibold text-foreground">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Link>
  );
}
