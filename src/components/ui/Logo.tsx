import { clsx } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        className="shrink-0 text-accent"
        aria-hidden="true"
      >
        <path
          d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z"
          fill="currentColor"
        />
        <path
          d="M5 19c4-1.5 8.5-5.5 11-11"
          stroke="var(--surface)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-base font-semibold text-foreground">
        Plandex
      </span>
    </span>
  );
}
