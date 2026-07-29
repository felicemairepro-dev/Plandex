"use client";

import { useActionState, useState, useTransition } from "react";
import { updateExtra, toggleExtraActive } from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatLocalTime, getDurationLabel } from "@/lib/hours-utils";
import type { ActionResult, Profile, TimeEntryWithShift } from "@/lib/types";

const initialState: ActionResult = {};

export function ExtraRow({
  extra,
  history,
}: {
  extra: Profile;
  history: TimeEntryWithShift[];
}) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateExtra,
    initialState
  );
  const [togglePending, startToggle] = useTransition();

  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state.success) setEditing(false);
  }

  const [firstName, ...rest] = (extra.full_name ?? "").split(" ");
  const lastName = rest.join(" ");

  if (editing) {
    return (
      <div className="flex flex-col gap-4 border-b border-border py-5 last:border-none">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={extra.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id={`firstName-${extra.id}`}
              name="firstName"
              label="Prénom"
              defaultValue={firstName}
              required
            />
            <Input
              id={`lastName-${extra.id}`}
              name="lastName"
              label="Nom"
              defaultValue={lastName}
              required
            />
          </div>
          <Input
            id={`phone-${extra.id}`}
            name="phone"
            type="tel"
            label="Téléphone"
            defaultValue={extra.phone ?? ""}
          />

          {state.error && (
            <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="border-b border-border py-5 last:border-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">
            {extra.full_name || "Sans nom"}
          </p>
          <p className="text-sm text-muted">{extra.email}</p>
          {extra.phone && <p className="text-sm text-muted">{extra.phone}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={extra.actif ? "success" : "neutral"}>
            {extra.actif ? "Actif" : "Inactif"}
          </Badge>
          <Button
            variant="secondary"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? "Masquer l'historique" : "Historique des heures"}
          </Button>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Modifier
          </Button>
          <Button
            variant="secondary"
            loading={togglePending}
            onClick={() =>
              startToggle(async () => {
                await toggleExtraActive(extra.id, !extra.actif);
              })
            }
          >
            {extra.actif ? "Désactiver" : "Réactiver"}
          </Button>
        </div>
      </div>

      {showHistory && (
        <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted">Aucun pointage enregistré.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="text-foreground">
                    {entry.shift &&
                      new Date(
                        `${entry.shift.date}T00:00:00`
                      ).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                    · {entry.shift?.poste}
                  </span>
                  <span className="text-muted">
                    {formatLocalTime(entry.heure_arrivee)} –{" "}
                    {formatLocalTime(entry.heure_depart)} (
                    {getDurationLabel(entry)})
                    {entry.corrige_par_admin && (
                      <span className="ml-2 text-xs text-sand-foreground">
                        corrigé
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
