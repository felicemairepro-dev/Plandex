"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Input } from "@/components/ui/Input";

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        rightSlot={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            aria-label={
              visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:text-foreground"
          >
            {visible ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M6.6 6.7C4.3 8.2 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.5 4.9-1.3" />
                <path d="M9.9 4.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-2.3 3.3" />
              </svg>
            )}
          </button>
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = "PasswordInput";
