import { InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Optional element (e.g. a button) absolutely positioned inside the input, on the right. */
  rightSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, rightSlot, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={clsx(
              "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors duration-200 outline-none",
              "focus:border-accent focus:ring-2 focus:ring-accent/20",
              error && "border-danger focus:border-danger focus:ring-danger/20",
              Boolean(rightSlot) && "pr-10",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              {rightSlot}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
