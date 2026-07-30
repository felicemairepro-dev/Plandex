"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ShiftForm } from "@/components/planning/ShiftForm";
import {
  addDays,
  addMonths,
  getMonthStart,
  getWeekStart,
  isSameDay,
  timeToMinutes,
  toISODate,
} from "@/lib/date-utils";
import type { Profile, ShiftWithExtra, TimeEntry } from "@/lib/types";

const HOUR_HEIGHT = 56;
const DEFAULT_RANGE: [number, number] = [7, 21];
const MONTH_GRID_WEEKS = 6;
const MAX_CHIPS_PER_DAY = 3;

const CANCELLED_STYLE =
  "border-danger bg-danger-bg text-danger line-through opacity-80";

const EXTRA_COLOR_PALETTE = [
  "#2d5a3d",
  "#1d4ed8",
  "#b45309",
  "#7c3aed",
  "#be185d",
  "#0891b2",
  "#4d7c0f",
  "#9333ea",
  "#c2410c",
  "#0f766e",
];

function getExtraColor(extraId: string) {
  let hash = 0;
  for (let i = 0; i < extraId.length; i++) {
    hash = (hash * 31 + extraId.charCodeAt(i)) >>> 0;
  }
  return EXTRA_COLOR_PALETTE[hash % EXTRA_COLOR_PALETTE.length];
}

const PROGRESS_COLOR_ENCOURS = "#1d4ed8";

type ShiftPhase = "avenir" | "encours" | "termine";

const PROGRESS_PHASE_LABELS: Record<ShiftPhase, string> = {
  avenir: "À venir",
  encours: "En cours",
  termine: "Terminé",
};

const PROGRESS_PHASE_DOT_COLORS: Record<ShiftPhase, string> = {
  avenir: "#b9752e",
  encours: PROGRESS_COLOR_ENCOURS,
  termine: "#2f6b45",
};

function getShiftProgressPhase(
  shift: ShiftWithExtra,
  now: Date
): "avenir" | "encours" | "termine" {
  const todayISO = toISODate(now);
  if (shift.date < todayISO) return "termine";
  if (shift.date > todayISO) return "avenir";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(shift.heure_debut);
  const end = timeToMinutes(shift.heure_fin);
  if (nowMinutes < start) return "avenir";
  if (nowMinutes < end) return "encours";
  return "termine";
}

/**
 * Couleur d'un créneau dans le calendrier : par extra pour l'admin (pour
 * distinguer qui travaille où), par avancement (à venir / en cours /
 * terminé) pour l'extra sur son propre planning en lecture seule.
 */
function getBlockAppearance(
  shift: ShiftWithExtra,
  readOnly: boolean,
  now: Date
): { className: string; style: React.CSSProperties } {
  if (shift.statut === "annule") {
    return { className: CANCELLED_STYLE, style: {} };
  }

  if (readOnly) {
    const phase = getShiftProgressPhase(shift, now);
    if (phase === "avenir") {
      return {
        className: "border-warning bg-warning-bg text-warning",
        style: {},
      };
    }
    if (phase === "termine") {
      return {
        className: "border-success bg-success-bg text-success",
        style: {},
      };
    }
    return {
      className: "text-foreground",
      style: {
        borderColor: PROGRESS_COLOR_ENCOURS,
        backgroundColor: `${PROGRESS_COLOR_ENCOURS}1a`,
        color: PROGRESS_COLOR_ENCOURS,
      },
    };
  }

  const color = getExtraColor(shift.extra_id);
  return {
    className: "text-foreground",
    style: {
      borderColor: color,
      backgroundColor: `${color}1a`,
      color,
      borderStyle: shift.statut === "propose" ? "dashed" : "solid",
    },
  };
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = weekStart.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: sameMonth ? undefined : "long",
  });
  const endLabel = weekEnd.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

function formatMonthLabel(monthDate: Date) {
  return monthDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

type ViewMode = "semaine" | "mois";

export function WeekCalendar({
  shifts,
  extras = [],
  entriesByShiftId = {},
  readOnly = false,
}: {
  shifts: ShiftWithExtra[];
  extras?: Profile[];
  entriesByShiftId?: Record<string, TimeEntry>;
  readOnly?: boolean;
}) {
  const [view, setView] = useState<ViewMode>("semaine");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [monthDate, setMonthDate] = useState(() => getMonthStart(new Date()));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithExtra | null>(
    null
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekShifts = useMemo(() => {
    const dayISOs = new Set(days.map(toISODate));
    return shifts.filter((s) => dayISOs.has(s.date));
  }, [shifts, days]);

  const [rangeStart, rangeEnd] = useMemo(() => {
    let start = DEFAULT_RANGE[0];
    let end = DEFAULT_RANGE[1];
    for (const shift of weekShifts) {
      start = Math.min(start, Math.floor(timeToMinutes(shift.heure_debut) / 60));
      end = Math.max(end, Math.ceil(timeToMinutes(shift.heure_fin) / 60));
    }
    return [Math.max(0, start), Math.min(24, end)];
  }, [weekShifts]);

  const hours = Array.from(
    { length: rangeEnd - rangeStart },
    (_, i) => rangeStart + i
  );
  const gridHeight = (rangeEnd - rangeStart) * HOUR_HEIGHT;
  const today = new Date();

  const monthDays = useMemo(() => {
    const gridStart = getWeekStart(monthDate);
    return Array.from({ length: MONTH_GRID_WEEKS * 7 }, (_, i) =>
      addDays(gridStart, i)
    );
  }, [monthDate]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftWithExtra[]>();
    for (const shift of shifts) {
      const list = map.get(shift.date) ?? [];
      list.push(shift);
      map.set(shift.date, list);
    }
    return map;
  }, [shifts]);

  function goToToday() {
    setWeekStart(getWeekStart(new Date()));
    setMonthDate(getMonthStart(new Date()));
  }

  function goPrevious() {
    if (view === "semaine") setWeekStart(addDays(weekStart, -7));
    else setMonthDate(addMonths(monthDate, -1));
  }

  function goNext() {
    if (view === "semaine") setWeekStart(addDays(weekStart, 7));
    else setMonthDate(addMonths(monthDate, 1));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={goPrevious}>
            ‹
          </Button>
          <Button variant="secondary" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <Button variant="secondary" onClick={goNext}>
            ›
          </Button>
          <span className="ml-2 text-sm font-medium capitalize text-foreground">
            {view === "semaine" ? formatWeekRange(weekStart) : formatMonthLabel(monthDate)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-background p-1">
            <button
              type="button"
              onClick={() => setView("semaine")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                view === "semaine"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Semaine
            </button>
            <button
              type="button"
              onClick={() => setView("mois")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                view === "mois"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Mois
            </button>
          </div>
          {!readOnly && (
            <Button onClick={() => setShowCreateForm(true)}>
              Créer un créneau
            </Button>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {(Object.keys(PROGRESS_PHASE_LABELS) as ShiftPhase[]).map((phase) => (
            <span key={phase} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: PROGRESS_PHASE_DOT_COLORS[phase] }}
              />
              {PROGRESS_PHASE_LABELS[phase]}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-success">
            ✓ Arrivée pointée
          </span>
        </div>
      )}

      {view === "semaine" ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <div className="grid min-w-[840px] grid-cols-[56px_repeat(7,1fr)]">
            <div className="border-b border-border" />
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={toISODate(day)}
                  className={`flex flex-col items-center gap-0.5 border-b border-l border-border py-2 ${
                    isToday ? "bg-accent/5" : ""
                  }`}
                >
                  <span className="text-xs font-medium uppercase text-muted">
                    {DAY_LABELS[(day.getDay() + 6) % 7]}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isToday ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}

            <div
              className="relative border-r border-border"
              style={{ height: gridHeight }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-1 -translate-y-1/2 text-xs text-muted"
                  style={{ top: (hour - rangeStart) * HOUR_HEIGHT }}
                >
                  {hour}h
                </div>
              ))}
            </div>

            {days.map((day) => {
              const dayISO = toISODate(day);
              const dayShifts = weekShifts.filter((s) => s.date === dayISO);

              return (
                <div
                  key={dayISO}
                  className="relative border-l border-border"
                  style={{ height: gridHeight }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute w-full border-t border-border/60"
                      style={{ top: (hour - rangeStart) * HOUR_HEIGHT }}
                    />
                  ))}

                  {dayShifts.map((shift) => {
                    const startMin =
                      timeToMinutes(shift.heure_debut) - rangeStart * 60;
                    const endMin =
                      timeToMinutes(shift.heure_fin) - rangeStart * 60;
                    const top = Math.max(0, (startMin / 60) * HOUR_HEIGHT);
                    const height = Math.max(
                      22,
                      ((endMin - startMin) / 60) * HOUR_HEIGHT
                    );

                    const Block = readOnly ? "div" : "button";
                    const isCancelled = shift.statut === "annule";
                    const hasArrived = Boolean(
                      entriesByShiftId[shift.id]?.heure_arrivee
                    );
                    const appearance = getBlockAppearance(shift, readOnly, today);
                    const phase = isCancelled
                      ? null
                      : getShiftProgressPhase(shift, today);

                    return (
                      <Block
                        key={shift.id}
                        onClick={readOnly ? undefined : () => setEditingShift(shift)}
                        className={`absolute left-1 right-1 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-shadow ${readOnly ? "" : "hover:shadow-md"} ${appearance.className}`}
                        style={{ top, height, ...appearance.style }}
                      >
                        {!readOnly && !isCancelled && hasArrived && (
                          <span
                            className="absolute right-1 top-1 text-success"
                            title="Arrivée pointée"
                          >
                            ✓
                          </span>
                        )}
                        <p className="flex items-center gap-1.5 font-semibold">
                          {!readOnly && phase && (
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: PROGRESS_PHASE_DOT_COLORS[phase],
                              }}
                              title={PROGRESS_PHASE_LABELS[phase]}
                            />
                          )}
                          {shift.heure_debut.slice(0, 5)}–
                          {shift.heure_fin.slice(0, 5)}
                        </p>
                        <p className="truncate">
                          {readOnly
                            ? shift.lieu
                            : shift.extra?.full_name || shift.extra?.email}
                        </p>
                        <p className="truncate opacity-80">{shift.poste}</p>
                      </Block>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <div className="grid min-w-[700px] grid-cols-7">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="border-b border-l border-border py-2 text-center text-xs font-medium uppercase text-muted first:border-l-0"
              >
                {label}
              </div>
            ))}
            {monthDays.map((day) => {
              const dayISO = toISODate(day);
              const isToday = isSameDay(day, today);
              const isCurrentMonth = day.getMonth() === monthDate.getMonth();
              const dayShifts = shiftsByDate.get(dayISO) ?? [];
              const visibleShifts = dayShifts.slice(0, MAX_CHIPS_PER_DAY);
              const hiddenCount = dayShifts.length - visibleShifts.length;

              return (
                <div
                  key={dayISO}
                  className={`min-h-[96px] border-b border-l border-border p-1.5 first-of-type:border-l-0 ${
                    isCurrentMonth ? "" : "bg-background/60"
                  } ${isToday ? "bg-accent/5" : ""}`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      isToday
                        ? "text-accent"
                        : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 flex flex-col gap-1">
                    {visibleShifts.map((shift) => {
                      const Chip = readOnly ? "div" : "button";
                      const isCancelled = shift.statut === "annule";
                      const hasArrived = Boolean(
                        entriesByShiftId[shift.id]?.heure_arrivee
                      );
                      const appearance = getBlockAppearance(shift, readOnly, today);
                      const phase = isCancelled
                        ? null
                        : getShiftProgressPhase(shift, today);
                      return (
                        <Chip
                          key={shift.id}
                          onClick={
                            readOnly ? undefined : () => setEditingShift(shift)
                          }
                          className={`relative w-full truncate rounded border-l-2 px-1 py-0.5 text-left text-[10px] leading-tight ${appearance.className}`}
                          style={appearance.style}
                        >
                          {!readOnly && phase && (
                            <span
                              className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                              style={{
                                backgroundColor: PROGRESS_PHASE_DOT_COLORS[phase],
                              }}
                              title={PROGRESS_PHASE_LABELS[phase]}
                            />
                          )}
                          {!readOnly && !isCancelled && hasArrived && (
                            <span className="mr-0.5 text-success">✓</span>
                          )}
                          {shift.heure_debut.slice(0, 5)}{" "}
                          {readOnly
                            ? shift.poste
                            : shift.extra?.full_name || shift.extra?.email}
                        </Chip>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <span className="px-1 text-[10px] text-muted">
                        +{hiddenCount} autre{hiddenCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCreateForm && (
        <Modal onClose={() => setShowCreateForm(false)}>
          <ShiftForm extras={extras} onDone={() => setShowCreateForm(false)} />
        </Modal>
      )}

      {editingShift && (
        <Modal onClose={() => setEditingShift(null)}>
          <ShiftForm
            extras={extras}
            shift={editingShift}
            entry={entriesByShiftId[editingShift.id] ?? null}
            onDone={() => setEditingShift(null)}
          />
        </Modal>
      )}
    </div>
  );
}
