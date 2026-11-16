"use client";

import { useActionState, useState, useTransition } from "react";
import {
  setExtraPaidStatus,
  toggleExtraActive,
  updateExtra,
} from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { RecapModal } from "@/components/hours/RecapModal";
import { DeleteExtraModal } from "@/components/team/DeleteExtraModal";
import { formatLocalTime, getDurationLabel } from "@/lib/hours-utils";
import { computeEntryMinutes, formatHoursLabel } from "@/lib/monthly-recap";
import type { ActionResult, Profile, TimeEntryWithShift } from "@/lib/types";

interface MonthGroup {
  key: string; // "YYYY-MM"
  label: string;
  entries: TimeEntryWithShift[];
  totalMinutes: number;
  montant: number;
  allPaid: boolean;
  paidLabel: string | null;
}

function buildMonthGroups(
  completedEntries: TimeEntryWithShift[],
  extraTauxHoraire: number | null
): MonthGroup[] {
  const map = new Map<string, MonthGroup>();

  for (const entry of completedEntries) {
    const key = entry.shift!.date.slice(0, 7);
    const existing = map.get(key) ?? {
      key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
      entries: [],
      totalMinutes: 0,
      montant: 0,
      allPaid: true,
      paidLabel: null,
    };

    existing.entries.push(entry);
    const minutes = computeEntryMinutes(entry);
    existing.totalMinutes += minutes;
    const taux = entry.shift?.taux_horaire ?? extraTauxHoraire;
    const montant = minutes > 0 && taux != null ? (minutes / 60) * taux : 0;
    existing.montant += montant;
    if (!entry.paye) existing.allPaid = false;
    if (entry.paye && entry.paye_le) {
      if (!existing.paidLabel || entry.paye_le > existing.paidLabel) {
        existing.paidLabel = entry.paye_le;
      }
    }
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
}

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
  const [showRecap, setShowRecap] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateExtra,
    initialState
  );
  const [togglePending, startToggle] = useTransition();
  const [paymentPending, startPaymentTransition] = useTransition();
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state.success) setEditing(false);
  }

  const [firstName, ...rest] = (extra.full_name ?? "").split(" ");
  const lastName = rest.join(" ");

  const completedEntries = history.filter(
    (entry) => entry.heure_arrivee && entry.heure_depart
  );
  const joursTravailles = new Set(
    completedEntries.map((entry) => entry.shift?.date).filter(Boolean)
  ).size;
  const totalWorkedMinutes = completedEntries.reduce(
    (sum, entry) => sum + computeEntryMinutes(entry),
    0
  );
  const monthGroups = buildMonthGroups(completedEntries, extra.taux_horaire);
  const resteAPayer = monthGroups.reduce(
    (sum, g) => sum + (g.allPaid ? 0 : g.montant),
    0
  );
  const totalPaye = monthGroups.reduce(
    (sum, g) => sum + (g.allPaid ? g.montant : 0),
    0
  );

  function handleToggleMonthPaid(group: MonthGroup) {
    setPaymentError(null);
    startPaymentTransition(async () => {
      const nextPaye = !group.allPaid;
      const label = `${group.montant.toFixed(2)} € pour ${formatHoursLabel(group.totalMinutes)} effectuées en ${group.label}`;
      const message = nextPaye ? `Vous avez été payé — ${label}.` : undefined;
      const result = await setExtraPaidStatus(
        extra.id,
        group.entries.map((entry) => entry.id),
        nextPaye,
        `${group.key}-01`,
        group.montant,
        message
      );
      if (result.error) {
        setPaymentError(result.error);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4 border-b border-border py-5 last:border-none">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={extra.id} />
          <input
            type="hidden"
            name="previousEmail"
            value={extra.email ?? ""}
          />
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
            id={`email-${extra.id}`}
            name="email"
            type="email"
            label="Email"
            placeholder="vous@exemple.com"
            defaultValue={extra.email ?? ""}
            hint={
              extra.email
                ? undefined
                : "Pas encore d'accès de connexion — ajouter un email envoie un lien pour choisir le mot de passe."
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id={`phone-${extra.id}`}
              name="phone"
              type="tel"
              label="Téléphone"
              defaultValue={extra.phone ?? ""}
            />
            <Input
              id={`taux_horaire-${extra.id}`}
              name="taux_horaire"
              type="number"
              step="0.01"
              min="0"
              label="Taux horaire (€)"
              placeholder="Ex: 15.50"
              defaultValue={extra.taux_horaire ?? ""}
            />
          </div>
          <p className="text-xs text-muted">
            Sert uniquement à estimer un montant à facturer — aucun paiement
            n&apos;est déclenché automatiquement.
          </p>

          {state.error && (
            <p className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              className="!border-danger !text-danger"
              onClick={() => setShowDelete(true)}
            >
              Supprimer l&apos;équipier
            </Button>
            <div className="flex gap-3">
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
          </div>
        </form>

        {showDelete && (
          <DeleteExtraModal
            extraId={extra.id}
            extraName={extra.full_name || extra.email || "cet équipier"}
            onClose={() => setShowDelete(false)}
            onDeleted={() => setShowDelete(false)}
          />
        )}
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
          {extra.email ? (
            <p className="text-sm text-muted">{extra.email}</p>
          ) : (
            <p className="text-sm text-warning">Pas d&apos;accès de connexion</p>
          )}
          {extra.phone && <p className="text-sm text-muted">{extra.phone}</p>}
          {extra.taux_horaire != null && (
            <p className="text-sm text-muted">{extra.taux_horaire} €/h</p>
          )}
          <p className="text-sm text-muted">
            {joursTravailles} jour{joursTravailles > 1 ? "s" : ""} travaillé
            {joursTravailles > 1 ? "s" : ""} ·{" "}
            {formatHoursLabel(totalWorkedMinutes)} effectuées
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={extra.actif ? "success" : "neutral"}>
            {extra.actif ? "Actif" : "Inactif"}
          </Badge>
          <Button
            variant="secondary"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? "Masquer l'historique" : "Historique des heures"}
          </Button>
          <Button variant="secondary" onClick={() => setShowRecap(true)}>
            Générer le récapitulatif du mois
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

      <div className="mt-3 rounded-xl bg-background px-4 py-3">
        {completedEntries.length === 0 ? (
          <p className="text-sm text-muted">
            Aucune mission effectuée pour le moment.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Reste à payer : {resteAPayer.toFixed(2)} €
              </p>
              <p className="text-sm text-muted">
                Déjà payé : {totalPaye.toFixed(2)} €
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              Indicatif — le paiement se fait en dehors de l&apos;application.
              Historique par mois ci-dessous.
            </p>

            <ul className="mt-3 flex flex-col gap-2">
              {monthGroups.map((group) => (
                <li
                  key={group.key}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ${
                    group.allPaid ? "bg-success-bg" : "bg-surface"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium capitalize text-foreground">
                      {group.label}
                    </p>
                    <p className="text-xs text-muted">
                      {formatHoursLabel(group.totalMinutes)} ·{" "}
                      {group.montant.toFixed(2)} €
                      {group.allPaid && group.paidLabel && (
                        <>
                          {" "}
                          · payé le{" "}
                          {new Date(group.paidLabel).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "short" }
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.allPaid && <Badge variant="success">Payé</Badge>}
                    <Button
                      variant="secondary"
                      loading={paymentPending}
                      onClick={() => handleToggleMonthPaid(group)}
                    >
                      {group.allPaid
                        ? "Marquer comme non payé"
                        : "Marquer comme payé"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {paymentError && (
          <p className="mt-2 text-sm text-danger">{paymentError}</p>
        )}
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
                    {entry.paye && (
                      <span className="ml-2 text-xs text-success">payé</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showRecap && (
        <RecapModal
          extra={extra}
          entries={history}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  );
}
