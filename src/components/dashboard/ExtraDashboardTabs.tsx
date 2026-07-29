"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ExtraShiftCard } from "@/components/planning/ExtraShiftCard";
import { ClockInOut } from "@/components/hours/ClockInOut";
import { RequestReplacementButton } from "@/components/planning/RequestReplacementButton";
import { WeekCalendar } from "@/components/planning/WeekCalendar";
import { RecapView } from "@/components/hours/RecapView";
import type {
  Profile,
  Shift,
  ShiftWithExtra,
  TimeEntry,
  TimeEntryWithShift,
} from "@/lib/types";

type Tab = "planning" | "calendrier" | "heures";

const TABS: { id: Tab; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "calendrier", label: "Calendrier" },
  { id: "heures", label: "Mes heures" },
];

export function ExtraDashboardTabs({
  profile,
  upcoming,
  past,
  entriesByShiftId,
  calendarShifts,
  recapEntries,
  today,
}: {
  profile: Profile;
  upcoming: Shift[];
  past: Shift[];
  entriesByShiftId: Record<string, TimeEntry>;
  calendarShifts: ShiftWithExtra[];
  recapEntries: TimeEntryWithShift[];
  today: string;
}) {
  const [tab, setTab] = useState<Tab>("planning");

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              tab === t.id
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "planning" && (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              À venir
            </h2>
            {upcoming.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">Aucun créneau à venir.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((shift) => (
                  <ExtraShiftCard key={shift.id} shift={shift}>
                    {shift.date === today && (
                      <ClockInOut
                        shift={shift}
                        entry={entriesByShiftId[shift.id] ?? null}
                      />
                    )}
                    {shift.statut === "confirme" && (
                      <RequestReplacementButton shift={shift} />
                    )}
                  </ExtraShiftCard>
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Passés
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {past.map((shift) => (
                  <ExtraShiftCard key={shift.id} shift={shift} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "calendrier" && (
        <WeekCalendar shifts={calendarShifts} readOnly />
      )}

      {tab === "heures" && (
        <RecapView extra={profile} entries={recapEntries} />
      )}
    </div>
  );
}
