"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markMonthPaid,
  toggleExtraActive,
  unmarkMonthPaid,
  updateExtra,
} from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { RecapModal } from "@/components/hours/RecapModal";
import { getMonthEnd, getMonthStart, toISODate } from "@/lib/date-utils";
import { formatLocalTime, getDurationLabel } from "@/lib/hours-utils";
import { computeEntryMinutes, estimateAmount } from "@/lib/monthly-recap";
import type {
  ActionResult,
  Payment,
  Profile,
  TimeEntryWithShift,
} from "@/lib/types";

const initialState: ActionResult = {};

export function ExtraRow({
  extra,
  history,
  payments,
}: {
  extra: Profile;
  history: TimeEntryWithShift[];
  payments: Payment[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
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

  const now = new Date();
  const currentMonthISO = toISODate(getMonthStart(now));
  const monthStartISO = currentMonthISO;
  const monthEndISO = toISODate(getMonthEnd(now));
  const monthMinutes = history
    .filter(
      (entry) =>
        entry.shift &&
        entry.shift.date >= monthStartISO &&
        entry.shift.date <= monthEndISO
    )
    .reduce((sum, entry) => sum + computeEntryMinutes(entry), 0);
  const monthAmountDue = estimateAmount(monthMinutes, extra.taux_horaire);
  const currentMonthPayment = payments.find((p) => p.mois === currentMonthISO);
  const monthLabel = now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  function handleTogglePayment() {
    setPaymentError(null);
    startPaymentTransition(async () => {
      const result = currentMonthPayment
        ? await unmarkMonthPaid(extra.id, currentMonthISO)
        : await markMonthPaid(
            extra.id,
            currentMonthISO,
            monthAmountDue ?? 0
          );
      if (result.error) {
        setPaymentError(result.error);
        return;
      }
      router.refresh();
    });
  }

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
          {extra.taux_horaire != null && (
            <p className="text-sm text-muted">{extra.taux_horaire} €/h</p>
          )}
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

      <div
        className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ${
          currentMonthPayment
            ? "bg-success-bg"
            : "bg-background"
        }`}
      >
        <div>
          <p className="text-sm font-medium capitalize text-foreground">
            {monthLabel}
          </p>
          <p className="text-sm text-muted">
            {monthAmountDue != null
              ? `${monthAmountDue.toFixed(2)} € pour ${(monthMinutes / 60).toFixed(1)}h effectuées`
              : "Taux horaire non renseigné"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentMonthPayment ? (
            <Badge variant="success">
              Payé le{" "}
              {new Date(currentMonthPayment.paye_le).toLocaleDateString(
                "fr-FR",
                { day: "numeric", month: "short" }
              )}
            </Badge>
          ) : (
            <Badge variant="warning">En attente de paiement</Badge>
          )}
          <Button
            variant="secondary"
            loading={paymentPending}
            onClick={handleTogglePayment}
            className={currentMonthPayment ? "!text-muted" : undefined}
          >
            {currentMonthPayment ? "Annuler le paiement" : "Marquer comme payé"}
          </Button>
        </div>
        {paymentError && (
          <p className="w-full text-sm text-danger">{paymentError}</p>
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
          payments={payments}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  );
}
