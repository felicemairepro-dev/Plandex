"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  addMonths,
  getMonthEnd,
  getMonthStart,
  toISODate,
} from "@/lib/date-utils";
import { formatLocalTime, getDurationLabel } from "@/lib/hours-utils";
import {
  computeEntryMinutes,
  estimateAmount,
  formatHoursLabel,
} from "@/lib/monthly-recap";
import type { Profile, TimeEntryWithShift } from "@/lib/types";

export function RecapView({
  extra,
  entries,
  onClose,
}: {
  extra: Pick<Profile, "full_name" | "email" | "taux_horaire">;
  entries: TimeEntryWithShift[];
  onClose?: () => void;
}) {
  const [referenceDate, setReferenceDate] = useState(() => new Date());

  const monthStart = getMonthStart(referenceDate);
  const monthEnd = getMonthEnd(referenceDate);
  const startISO = toISODate(monthStart);
  const endISO = toISODate(monthEnd);

  const monthEntries = entries
    .filter(
      (entry) =>
        entry.shift && entry.shift.date >= startISO && entry.shift.date <= endISO
    )
    .toSorted((a, b) => (a.shift!.date < b.shift!.date ? -1 : 1));

  const totalMinutes = monthEntries.reduce(
    (sum, entry) => sum + computeEntryMinutes(entry),
    0
  );
  const montantEstime = estimateAmount(totalMinutes, extra.taux_horaire);
  const monthLabel = monthStart.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="printable">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button
          variant="secondary"
          onClick={() => setReferenceDate((d) => addMonths(d, -1))}
        >
          ‹
        </Button>
        <span className="text-sm font-medium capitalize text-foreground">
          {monthLabel}
        </span>
        <Button
          variant="secondary"
          onClick={() => setReferenceDate((d) => addMonths(d, 1))}
        >
          ›
        </Button>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Récapitulatif — {extra.full_name || extra.email}
          </h2>
        </div>
        <p className="mt-1 text-sm capitalize text-muted">{monthLabel}</p>
        <p className="mt-1 text-xs text-muted">
          Ce document est une base indicative pour la facturation — ce
          n&apos;est pas une facture officielle Plandex.
        </p>
      </div>

      {monthEntries.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Aucun créneau pointé ce mois-ci.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Poste</th>
                <th className="py-2 pr-4 font-medium">Prévu</th>
                <th className="py-2 pr-4 font-medium">Réel</th>
                <th className="py-2 pr-4 font-medium">Durée</th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border last:border-none"
                >
                  <td className="py-2 pr-4 text-foreground">
                    {entry.shift &&
                      new Date(`${entry.shift.date}T00:00:00`).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "short" }
                      )}
                  </td>
                  <td className="py-2 pr-4 text-muted">{entry.shift?.poste}</td>
                  <td className="py-2 pr-4 text-muted">
                    {entry.shift?.heure_debut.slice(0, 5)}–
                    {entry.shift?.heure_fin.slice(0, 5)}
                  </td>
                  <td className="py-2 pr-4 text-foreground">
                    {formatLocalTime(entry.heure_arrivee)}–
                    {formatLocalTime(entry.heure_depart)}
                  </td>
                  <td className="py-2 pr-4 text-foreground">
                    {getDurationLabel(entry)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-1 border-t border-border pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Total d&apos;heures</span>
          <span className="font-semibold text-foreground">
            {formatHoursLabel(totalMinutes)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Montant estimé</span>
          <span className="font-semibold text-foreground">
            {montantEstime != null
              ? `${montantEstime.toFixed(2)} €`
              : "Taux horaire non renseigné"}
          </span>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 print:hidden">
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        )}
        <Button onClick={() => window.print()}>Télécharger en PDF</Button>
      </div>
    </Card>
  );
}
