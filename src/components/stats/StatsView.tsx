"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  addDays,
  addMonths,
  getMonthEnd,
  getMonthStart,
  getWeekStart,
  toISODate,
} from "@/lib/date-utils";
import { computeEntryMinutes, formatHoursLabel } from "@/lib/monthly-recap";
import { getLateMinutes } from "@/lib/hours-utils";
import type { Profile, TimeEntryWithShift } from "@/lib/types";

type PeriodType = "semaine" | "mois";
const LATE_THRESHOLD_MINUTES = 15;

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

function buildLastSixMonths(entries: TimeEntryWithShift[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => addMonths(now, i - 5));

  return months.map((month) => {
    const start = toISODate(getMonthStart(month));
    const end = toISODate(getMonthEnd(month));
    const totalMinutes = entries
      .filter((e) => e.shift && e.shift.date >= start && e.shift.date <= end)
      .reduce((sum, e) => sum + computeEntryMinutes(e), 0);

    return {
      label: month.toLocaleDateString("fr-FR", { month: "short" }),
      heures: Math.round((totalMinutes / 60) * 10) / 10,
    };
  });
}

export function StatsView({
  entries,
  extras,
}: {
  entries: TimeEntryWithShift[];
  extras: Profile[];
}) {
  const [periodType, setPeriodType] = useState<PeriodType>("mois");
  const [referenceDate, setReferenceDate] = useState(() => new Date());

  const monthlyData = buildLastSixMonths(entries);

  const { start, end } = getPeriodRange(referenceDate, periodType);
  const startISO = toISODate(start);
  const endISO = toISODate(end);

  const periodEntries = entries.filter(
    (e) => e.shift && e.shift.date >= startISO && e.shift.date <= endISO
  );

  const minutesByExtra = new Map<string, number>();
  for (const entry of periodEntries) {
    minutesByExtra.set(
      entry.extra_id,
      (minutesByExtra.get(entry.extra_id) ?? 0) + computeEntryMinutes(entry)
    );
  }
  const ranking = extras
    .map((extra) => ({
      extra,
      minutes: minutesByExtra.get(extra.id) ?? 0,
    }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const entriesWithArrival = entries.filter((e) => e.heure_arrivee && e.shift);
  const onTimeCount = entriesWithArrival.filter((e) => {
    const late = getLateMinutes(e);
    return late !== null && late <= LATE_THRESHOLD_MINUTES;
  }).length;
  const punctualityRate =
    entriesWithArrival.length > 0
      ? Math.round((onTimeCount / entriesWithArrival.length) * 100)
      : null;

  function changePeriod(amount: number) {
    setReferenceDate((prev) =>
      periodType === "semaine"
        ? addDays(prev, amount * 7)
        : addMonths(prev, amount)
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Taux de ponctualité global</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {punctualityRate != null ? `${punctualityRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">
            Pointages sans retard significatif (≤ {LATE_THRESHOLD_MINUTES} min),
            sur {entriesWithArrival.length} pointage
            {entriesWithArrival.length > 1 ? "s" : ""}.
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Heures ce mois-ci</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {formatHoursLabel(
              (monthlyData.at(-1)?.heures ?? 0) * 60
            )}
          </p>
          <p className="mt-1 text-xs text-muted">
            Toute l&apos;équipe confondue.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Heures travaillées · 6 derniers mois
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
                formatter={(value) => [`${value} h`, "Heures"]}
              />
              <Bar dataKey="heures" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Classement des extras
          </h2>
          <div className="flex items-center gap-2">
            <Select
              aria-label="Type de période"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
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
          </div>
        </div>

        {ranking.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Aucune heure pointée sur cette période.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-2">
            {ranking.map((row, index) => (
              <li
                key={row.extra.id}
                className="flex items-center justify-between border-b border-border py-2 text-sm last:border-none"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                    {index + 1}
                  </span>
                  <span className="text-foreground">
                    {row.extra.full_name || row.extra.email}
                  </span>
                </span>
                <span className="font-medium text-foreground">
                  {formatHoursLabel(row.minutes)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
