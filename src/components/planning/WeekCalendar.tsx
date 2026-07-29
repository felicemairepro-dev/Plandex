"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ShiftForm } from "@/components/planning/ShiftForm";
import {
  addDays,
  getWeekStart,
  isSameDay,
  timeToMinutes,
  toISODate,
} from "@/lib/date-utils";
import type { Profile, ShiftStatus, ShiftWithExtra } from "@/lib/types";

const HOUR_HEIGHT = 56;
const DEFAULT_RANGE: [number, number] = [7, 21];

const STATUS_BLOCK_STYLES: Record<ShiftStatus, string> = {
  confirme: "border-success bg-success-bg text-success",
  propose: "border-warning bg-warning-bg text-warning",
  annule: "border-border bg-sand/20 text-muted line-through",
};

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

export function WeekCalendar({
  shifts,
  extras,
}: {
  shifts: ShiftWithExtra[];
  extras: Profile[];
}) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            ‹
          </Button>
          <Button
            variant="secondary"
            onClick={() => setWeekStart(getWeekStart(new Date()))}
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="secondary"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            ›
          </Button>
          <span className="ml-2 text-sm font-medium capitalize text-foreground">
            {formatWeekRange(weekStart)}
          </span>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          Créer un créneau
        </Button>
      </div>

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

                  return (
                    <button
                      key={shift.id}
                      onClick={() => setEditingShift(shift)}
                      className={`absolute left-1 right-1 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-shadow hover:shadow-md ${STATUS_BLOCK_STYLES[shift.statut]}`}
                      style={{ top, height }}
                    >
                      <p className="font-semibold">
                        {shift.heure_debut.slice(0, 5)}–
                        {shift.heure_fin.slice(0, 5)}
                      </p>
                      <p className="truncate">
                        {shift.extra?.full_name || shift.extra?.email}
                      </p>
                      <p className="truncate opacity-80">{shift.poste}</p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

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
            onDone={() => setEditingShift(null)}
          />
        </Modal>
      )}
    </div>
  );
}
