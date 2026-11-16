-- ============================================================
-- Permet de fixer un taux horaire propre à un créneau, qui prime sur
-- celui du profil de l'extra (ex: un créneau exceptionnel payé plus).
-- ============================================================

alter table public.shifts
  add column if not exists taux_horaire numeric(10, 2);

-- ============================================================
-- La table "payments" (migration 0009) n'avait qu'insert/delete pour un
-- admin — un upsert (insert ... on conflict do update) a aussi besoin
-- d'une policy update, sans quoi RLS bloque la mise à jour d'un
-- paiement déjà enregistré pour le même mois.
-- ============================================================

create policy "payments_update_admin"
  on public.payments for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
