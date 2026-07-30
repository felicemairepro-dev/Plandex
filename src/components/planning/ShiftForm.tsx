"use client";

import { useActionState, useMemo, useState } from "react";
import { createShift, updateShift } from "@/app/dashboard/planning/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { SHIFT_STATUS_LABELS } from "@/lib/shift-status";
import { getDateRange } from "@/lib/date-utils";
import type { ActionResult, Profile, ShiftWithExtra } from "@/lib/types";

const initialState: ActionResult = {};
const MAX_RANGE_DAYS = 31;

function formatDayLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ShiftForm({
  extras,
  shift,
  onDone,
}: {
  extras: Profile[];
  shift?: ShiftWithExtra;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    shift ? updateShift : createShift,
    initialState
  );

  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state.success) onDone();
  }

  const [mode, setMode] = useState<"single" | "range">("single");
  const [sameHours, setSameHours] = useState(true);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const rangeDates = useMemo(
    () =>
      mode === "range" ? getDateRange(dateDebut, dateFin, MAX_RANGE_DAYS) : [],
    [mode, dateDebut, dateFin]
  );

  const isRangeMode = mode === "range" && !shift;

  // Un créneau existant peut être assigné à un extra depuis désactivé :
  // on l'ajoute quand même à la liste pour ne pas le remplacer par erreur.
  const extraOptions =
    shift?.extra && !extras.some((e) => e.id === shift.extra_id)
      ? [
          {
            id: shift.extra_id,
            full_name: `${shift.extra.full_name || shift.extra.email} (inactif)`,
            email: shift.extra.email,
          },
          ...extras,
        ]
      : extras;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-foreground">
        {shift ? "Modifier le créneau" : "Créer un créneau"}
      </h2>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        {shift && <input type="hidden" name="id" value={shift.id} />}
        <input type="hidden" name="mode" value={shift ? "single" : mode} />

        {!shift && (
          <div className="flex gap-1 rounded-xl bg-background p-1">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                mode === "single"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Date unique
            </button>
            <button
              type="button"
              onClick={() => setMode("range")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                mode === "range"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Plage de dates
            </button>
          </div>
        )}

        {!isRangeMode ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="date"
              name="date"
              type="date"
              label="Date"
              defaultValue={shift?.date}
              required
            />
            <Input
              id="heure_debut"
              name="heure_debut"
              type="time"
              label="Heure de début"
              defaultValue={shift?.heure_debut.slice(0, 5)}
              required
            />
            <Input
              id="heure_fin"
              name="heure_fin"
              type="time"
              label="Heure de fin"
              defaultValue={shift?.heure_fin.slice(0, 5)}
              required
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="dateDebut"
                name="dateDebut"
                type="date"
                label="Du"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                required
              />
              <Input
                id="dateFin"
                name="dateFin"
                type="date"
                label="Au"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="sameHours"
                value="true"
                checked={sameHours}
                onChange={(e) => setSameHours(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Même horaire chaque jour
            </label>

            {dateDebut && dateFin && rangeDates.length === 0 && (
              <p className="text-sm text-danger">
                La date de fin doit être après la date de début.
              </p>
            )}
            {rangeDates.length === MAX_RANGE_DAYS && (
              <p className="text-xs text-muted">
                Plage limitée à {MAX_RANGE_DAYS} jours.
              </p>
            )}

            {sameHours ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="heure_debut"
                  name="heure_debut"
                  type="time"
                  label="Heure de début"
                  required
                />
                <Input
                  id="heure_fin"
                  name="heure_fin"
                  type="time"
                  label="Heure de fin"
                  required
                />
              </div>
            ) : (
              rangeDates.length > 0 && (
                <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
                  {rangeDates.map((iso) => (
                    <div
                      key={iso}
                      className="grid grid-cols-3 items-center gap-3"
                    >
                      <span className="text-sm font-medium capitalize text-foreground">
                        {formatDayLabel(iso)}
                      </span>
                      <Input
                        id={`heure_debut_${iso}`}
                        name={`heure_debut_${iso}`}
                        type="time"
                        aria-label={`Heure de début ${iso}`}
                        required
                      />
                      <Input
                        id={`heure_fin_${iso}`}
                        name={`heure_fin_${iso}`}
                        type="time"
                        aria-label={`Heure de fin ${iso}`}
                        required
                      />
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="lieu"
            name="lieu"
            label="Lieu"
            defaultValue={shift?.lieu}
            required
          />
          <Input
            id="poste"
            name="poste"
            label="Poste"
            placeholder="Ex: Serveur, Aide cuisine"
            defaultValue={shift?.poste}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="extra_id"
            name="extra_id"
            label="Extra"
            defaultValue={shift?.extra_id}
            required
          >
            <option value="" disabled>
              Sélectionner un extra
            </option>
            {extraOptions.map((extra) => (
              <option key={extra.id} value={extra.id}>
                {extra.full_name || extra.email}
              </option>
            ))}
          </Select>

          <Select
            id="statut"
            name="statut"
            label="Statut"
            defaultValue={shift?.statut || "confirme"}
          >
            {Object.entries(SHIFT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {state.error && (
          <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
            {state.error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onDone}>
            Annuler
          </Button>
          <Button type="submit" loading={pending}>
            {shift
              ? "Enregistrer"
              : isRangeMode && rangeDates.length > 1
                ? `Créer ${rangeDates.length} créneaux`
                : "Créer le créneau"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
