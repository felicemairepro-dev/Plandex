import { HTMLAttributes } from "react";
import { clsx } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface p-8 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
