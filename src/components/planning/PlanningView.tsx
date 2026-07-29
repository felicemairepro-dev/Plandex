"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShiftForm } from "@/components/planning/ShiftForm";
import { cancelShift } from "@/app/dashboard/planning/actions";
import { SHIFT_STATUS_BADGE, SHIFT_STATUS_LABELS } from "@/lib/shift-status";
import type { Profile, ShiftWithExtra } from "@/lib/types";

function formatDateHeading(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function groupByDate(shifts: ShiftWithExtra[]) {
  const groups = new Map<string, ShiftWithExtra[]>();
  for (const shift of shifts) {
    const list = groups.get(shift.date) ?? [];
    list.push(shift);
    groups.set(shift.date, list);
  }
  return Array.from(groups.entries());
}

export function PlanningView({
  shifts,
  extras,
}: {
  shifts: ShiftWithExtra[];
  extras: Profile[];
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftWithExtra | null>(
    null
  );
  const grouped = useMemo(() => groupByDate(shifts), [shifts]);

  return (
    <div className="flex flex-col gap-6">
      {showCreateForm ? (
        <ShiftForm extras={extras} onDone={() => setShowCreateForm(false)} />
      ) : editingShift ? (
        <ShiftForm
          extras={extras}
          shift={editingShift}
          onDone={() => setEditingShift(null)}
        />
      ) : (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreateForm(true)}
            disabled={extras.length === 0}
          >
            Créer un créneau
          </Button>
        </div>
      )}

      {extras.length === 0 && !showCreateForm && (
        <p className="text-sm text-muted">
          Ajoutez au moins un extra actif dans l&apos;équipe avant de créer un
          créneau.
        </p>
      )}

      {grouped.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-muted">
            Aucun créneau pour le moment.
          </p>
        </Card>
      ) : (
        grouped.map(([date, dayShifts]) => (
          <Card key={date}>
            <h2 className="mb-2 text-sm font-semibold capitalize text-foreground">
              {formatDateHeading(date)}
            </h2>
            <div>
              {dayShifts.map((shift) =>
                editingShift?.id === shift.id ? null : (
                  <ShiftRowWithEdit
                    key={shift.id}
                    shift={shift}
                    onEdit={() => setEditingShift(shift)}
                  />
                )
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ShiftRowWithEdit({
  shift,
  onEdit,
}: {
  shift: ShiftWithExtra;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 last:border-none">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          {shift.heure_debut.slice(0, 5)} – {shift.heure_fin.slice(0, 5)}
        </span>
        <span className="text-sm text-muted">
          {shift.extra?.full_name || shift.extra?.email || "Extra inconnu"}
        </span>
        <span className="text-sm text-muted">{shift.poste}</span>
        <span className="text-sm text-muted">{shift.lieu}</span>
        <Badge variant={SHIFT_STATUS_BADGE[shift.statut]}>
          {SHIFT_STATUS_LABELS[shift.statut]}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onEdit}>
          Modifier
        </Button>
        {shift.statut !== "annule" && (
          <Button
            variant="secondary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                await cancelShift(shift.id);
              })
            }
          >
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
