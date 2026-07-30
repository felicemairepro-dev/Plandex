"use client";

import { useEffect, useReducer, useState, useTransition } from "react";
import { clockIn, clockOut } from "@/app/dashboard/actions";
import {
  LATE_THRESHOLD_MINUTES,
  computeLateMinutes,
} from "@/lib/hours-utils";
import type { Shift, TimeEntry } from "@/lib/types";

const EARLY_CLOCK_IN_MINUTES = 10;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScheduled(time: string) {
  return time.slice(0, 5);
}

function getClockInAvailability(heureDebut: string) {
  const now = new Date();
  const [hours, minutes] = heureDebut.split(":").map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(hours, minutes, 0, 0);
  const allowedFrom = new Date(scheduled.getTime() - EARLY_CLOCK_IN_MINUTES * 60000);

  if (now >= allowedFrom) {
    return { canClockIn: true as const };
  }
  return {
    canClockIn: false as const,
    allowedFromLabel: allowedFrom.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    minutesRemaining: Math.ceil((allowedFrom.getTime() - now.getTime()) / 60000),
  };
}

type ConfirmingAction = "arrivee" | "depart" | null;

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
  const [confirmingAction, setConfirmingAction] =
    useState<ConfirmingAction>(null);

  // Force un nouveau rendu périodiquement pour que le bouton de pointage
  // d'arrivée se débloque tout seul une fois la fenêtre des 10 min atteinte,
  // sans que l'extra ait besoin de recharger la page.
  const [, forceTick] = useReducer((c: number) => c + 1, 0);
  useEffect(() => {
    const id = setInterval(() => forceTick(), 30000);
    return () => clearInterval(id);
  }, []);

  const clockInAvailability = getClockInAvailability(shift.heure_debut);

  const lateMinutes = current?.heure_arrivee
    ? computeLateMinutes(shift.heure_debut, current.heure_arrivee)
    : null;
  const isLate = lateMinutes !== null && lateMinutes > LATE_THRESHOLD_MINUTES;

  function handleClockIn() {
    setError(null);
    startTransition(async () => {
      const result = await clockIn(shift.id);
      if (result.error || !result.entry) {
        setError(result.error || "Une erreur est survenue.");
        return;
      }
      setCurrent(result.entry);
      setConfirmingAction(null);
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
      setConfirmingAction(null);
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
      {error && (
        <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {!current?.heure_arrivee && !clockInAvailability.canClockIn && (
        <p className="rounded-xl bg-background px-3.5 py-2.5 text-sm text-muted">
          Vous pourrez pointer votre arrivée à partir de{" "}
          <strong className="text-foreground">
            {clockInAvailability.allowedFromLabel}
          </strong>{" "}
          (dans {clockInAvailability.minutesRemaining} min).
        </p>
      )}

      {!current?.heure_arrivee &&
        clockInAvailability.canClockIn &&
        (confirmingAction === "arrivee" ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              Confirmer le pointage de votre arrivée maintenant ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingAction(null)}
                disabled={pending}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={handleClockIn}
                disabled={pending}
                className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition-all duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Enregistrement…" : "Oui, pointer l'arrivée"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingAction("arrivee")}
            disabled={pending}
            className="w-full rounded-xl bg-accent px-4 py-4 text-base font-semibold text-accent-foreground shadow-sm transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Pointer l&apos;arrivée
          </button>
        ))}

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
            {isLate && (
              <span className="ml-1 font-medium text-warning">
                (retard de {lateMinutes} min)
              </span>
            )}
          </p>

          {confirmingAction === "depart" ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">
                Confirmer le pointage de votre départ maintenant ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingAction(null)}
                  disabled={pending}
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={pending}
                  className="flex-1 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Enregistrement…" : "Oui, pointer le départ"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingAction("depart")}
              disabled={pending}
              className="w-full rounded-xl bg-foreground px-4 py-4 text-base font-semibold text-background shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Pointer le départ
            </button>
          )}
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
            {isLate && (
              <span className="ml-1 font-medium text-warning">
                (retard de {lateMinutes} min à l&apos;arrivée)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
