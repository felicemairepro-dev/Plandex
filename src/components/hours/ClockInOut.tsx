"use client";

import { useState, useTransition } from "react";
import { clockIn, clockOut } from "@/app/dashboard/actions";
import type { Shift, TimeEntry } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScheduled(time: string) {
  return time.slice(0, 5);
}

export function ClockInOut({
  shift,
  entry,
}: {
  shift: Shift;
  entry: TimeEntry | null;
}) {
  const [current, setCurrent] = useState(entry);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClockIn() {
    setError(null);
    startTransition(async () => {
      const result = await clockIn(shift.id);
      if (result.error || !result.entry) {
        setError(result.error || "Une erreur est survenue.");
        return;
      }
      setCurrent(result.entry);
    });
  }

  function handleClockOut() {
    setError(null);
    startTransition(async () => {
      const result = await clockOut(shift.id);
      if (result.error || !result.entry) {
        setError(result.error || "Une erreur est survenue.");
        return;
      }
      setCurrent(result.entry);
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
      {error && (
        <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {!current?.heure_arrivee && (
        <button
          onClick={handleClockIn}
          disabled={pending}
          className="w-full rounded-xl bg-accent px-4 py-4 text-base font-semibold text-accent-foreground shadow-sm transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Pointer l'arrivée"}
        </button>
      )}

      {current?.heure_arrivee && !current?.heure_depart && (
        <>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className="animate-pop-in text-success">✓</span>
            <span>
              Arrivée enregistrée à{" "}
              <strong>{formatTime(current.heure_arrivee)}</strong>
            </span>
          </div>
          <p className="text-xs text-muted">
            Prévu {formatScheduled(shift.heure_debut)} · Pointé{" "}
            {formatTime(current.heure_arrivee)}
          </p>
          <button
            onClick={handleClockOut}
            disabled={pending}
            className="w-full rounded-xl bg-accent px-4 py-4 text-base font-semibold text-accent-foreground shadow-sm transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Enregistrement…" : "Pointer le départ"}
          </button>
        </>
      )}

      {current?.heure_arrivee && current?.heure_depart && (
        <div className="flex flex-col gap-1 rounded-xl bg-success-bg px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <span className="animate-pop-in">✓</span>
            <span>Présence enregistrée</span>
          </div>
          <p className="text-sm text-success">
            {formatTime(current.heure_arrivee)} –{" "}
            {formatTime(current.heure_depart)}
          </p>
          <p className="text-xs text-success/80">
            Prévu {formatScheduled(shift.heure_debut)}–
            {formatScheduled(shift.heure_fin)}
          </p>
        </div>
      )}
    </div>
  );
}
