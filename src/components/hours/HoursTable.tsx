"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { CorrectionForm } from "@/components/hours/CorrectionForm";
import {
  addDays,
  getMonthEnd,
  getMonthStart,
  getWeekStart,
  toISODate,
} from "@/lib/date-utils";
import {
  formatLocalTime,
  getDurationLabel,
  getLateMinutes,
} from "@/lib/hours-utils";
import {
  buildRecapByExtra,
  estimateAmount,
  formatHoursLabel,
} from "@/lib/monthly-recap";
import type { Profile, TimeEntryWithShift } from "@/lib/types";

const PAGE_SIZE = 15;
const LATE_THRESHOLD_MINUTES = 15;

type PeriodType = "semaine" | "mois";

function getPeriodRange(referenceDate: Date, periodType: PeriodType) {
  if (periodType === "semaine") {
    const start = getWeekStart(referenceDate);
    return { start, end: addDays(start, 6) };
  }
  return { start: getMonthStart(referenceDate), end: getMonthEnd(referenceDate) };
}

function formatPeriodLabel(start: Date, end: Date, periodType: PeriodType) {
  if (periodType === "mois") {
    return start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  return `${start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function HoursTable({
  entries,
  extras,
}: {
  entries: TimeEntryWithShift[];
  extras: Profile[];
}) {
  const [periodType, setPeriodType] = useState<PeriodType>("semaine");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [extraFilter, setExtraFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [correctingEntry, setCorrectingEntry] =
    useState<TimeEntryWithShift | null>(null);

  const { start, end } = getPeriodRange(referenceDate, periodType);
  const startISO = toISODate(start);
  const endISO = toISODate(end);

  const filtered = entries
    .filter((entry) => {
      if (!entry.shift) return false;
      if (entry.shift.date < startISO || entry.shift.date > endISO) {
        return false;
      }
      if (extraFilter !== "all" && entry.extra_id !== extraFilter) {
        return false;
      }
      return true;
    })
    .toSorted((a, b) => (a.shift!.date < b.shift!.date ? -1 : 1));

  const tauxHoraireByExtraId = new Map(
    extras.map((extra) => [extra.id, extra.taux_horaire])
  );
  const recap = buildRecapByExtra(filtered, tauxHoraireByExtraId);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  function changePeriod(amount: number) {
    setPage(0);
    setReferenceDate((prev) =>
      periodType === "semaine"
        ? addDays(prev, amount * 7)
        : new Date(prev.getFullYear(), prev.getMonth() + amount, 1)
    );
  }

  function handleExportCsv() {
    const header = [
      "Extra",
      "Date",
      "Poste",
      "Prévu début",
      "Prévu fin",
      "Arrivée réelle",
      "Départ réel",
      "Durée",
      "Corrigé manuellement",
      "Taux horaire (€)",
      "Montant estimé (€)",
    ];
    const rows = filtered.map((entry) => {
      const tauxHoraire = tauxHoraireByExtraId.get(entry.extra_id) ?? null;
      const minutes =
        entry.heure_arrivee && entry.heure_depart
          ? Math.round(
              (new Date(entry.heure_depart).getTime() -
                new Date(entry.heure_arrivee).getTime()) /
                60000
            )
          : 0;
      const montant = estimateAmount(minutes, tauxHoraire);

      return [
        entry.extra?.full_name || "",
        entry.shift?.date || "",
        entry.shift?.poste || "",
        entry.shift?.heure_debut.slice(0, 5) || "",
        entry.shift?.heure_fin.slice(0, 5) || "",
        formatLocalTime(entry.heure_arrivee),
        formatLocalTime(entry.heure_depart),
        getDurationLabel(entry),
        entry.corrige_par_admin ? "Oui" : "Non",
        tauxHoraire != null ? tauxHoraire.toFixed(2) : "",
        montant != null ? montant.toFixed(2) : "",
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
      .join("\n");

    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `heures_${startISO}_${endISO}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Type de période"
            value={periodType}
            onChange={(e) => {
              setPeriodType(e.target.value as PeriodType);
              setPage(0);
            }}
            className="w-auto"
          >
            <option value="semaine">Semaine</option>
            <option value="mois">Mois</option>
          </Select>
          <Button variant="secondary" onClick={() => changePeriod(-1)}>
            ‹
          </Button>
          <span className="text-sm font-medium capitalize text-foreground">
            {formatPeriodLabel(start, end, periodType)}
          </span>
          <Button variant="secondary" onClick={() => changePeriod(1)}>
            ›
          </Button>

          <Select
            aria-label="Filtrer par extra"
            value={extraFilter}
            onChange={(e) => {
              setExtraFilter(e.target.value);
              setPage(0);
            }}
            className="w-auto"
          >
            <option value="all">Tous les extras</option>
            {extras.map((extra) => (
              <option key={extra.id} value={extra.id}>
                {extra.full_name || extra.email}
              </option>
            ))}
          </Select>
        </div>

        <Button variant="secondary" onClick={handleExportCsv}>
          Exporter en CSV
        </Button>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Récapitulatif · {formatPeriodLabel(start, end, periodType)}
        </h2>
        {recap.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Aucune heure pointée sur cette période.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="py-1.5 pr-4 font-medium">Extra</th>
                  <th className="py-1.5 pr-4 font-medium">Heures totales</th>
                  <th className="py-1.5 pr-4 font-medium">
                    Créneaux effectués
                  </th>
                  <th className="py-1.5 pr-4 font-medium">Montant estimé</th>
                </tr>
              </thead>
              <tbody>
                {recap.map((row) => (
                  <tr key={row.extraId}>
                    <td className="py-1.5 pr-4 font-medium text-foreground">
                      {row.extraName}
                    </td>
                    <td className="py-1.5 pr-4 text-foreground">
                      {formatHoursLabel(row.totalMinutes)}
                    </td>
                    <td className="py-1.5 pr-4 text-foreground">
                      {row.shiftsCompleted}
                    </td>
                    <td className="py-1.5 pr-4 text-foreground">
                      {row.montantEstime != null
                        ? `${row.montantEstime.toFixed(2)} €`
                        : "Taux non renseigné"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Extra</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Poste</th>
                <th className="px-4 py-3 font-medium">Prévu</th>
                <th className="px-4 py-3 font-medium">Réel</th>
                <th className="px-4 py-3 font-medium">Durée</th>
                <th className="px-4 py-3 font-medium">Correction</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="Aucun pointage sur cette période"
                      description="Changez de période ou d'extra pour voir d'autres résultats."
                    />
                  </td>
                </tr>
              ) : (
                pageRows.map((entry) => {
                  const lateMinutes = getLateMinutes(entry);
                  const isLate =
                    lateMinutes !== null && lateMinutes > LATE_THRESHOLD_MINUTES;

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-none"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {entry.extra?.full_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {entry.shift &&
                          new Date(`${entry.shift.date}T00:00:00`).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "short" }
                          )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {entry.shift?.poste}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {entry.shift?.heure_debut.slice(0, 5)}–
                        {entry.shift?.heure_fin.slice(0, 5)}
                      </td>
                      <td
                        className={`px-4 py-3 ${isLate ? "font-medium text-warning" : "text-foreground"}`}
                      >
                        {formatLocalTime(entry.heure_arrivee)}–
                        {formatLocalTime(entry.heure_depart)}
                        {isLate && (
                          <span className="ml-1 text-xs">
                            (+{lateMinutes}min)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {getDurationLabel(entry)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.corrige_par_admin && (
                          <Badge variant="neutral">Corrigé</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          onClick={() => setCorrectingEntry(entry)}
                        >
                          Corriger
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted">
            Page {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
          >
            Suivant
          </Button>
        </div>
      )}

      {correctingEntry && (
        <Modal onClose={() => setCorrectingEntry(null)}>
          <CorrectionForm
            entry={correctingEntry}
            onDone={() => setCorrectingEntry(null)}
          />
        </Modal>
      )}
    </div>
  );
}
