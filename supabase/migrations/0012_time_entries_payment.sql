-- ============================================================
-- Remplace le suivi de paiement par mois (table `payments`, jamais
-- créée avec succès côté production) par un suivi par mission
-- directement sur `time_entries`, qui existe déjà et fonctionne.
-- ============================================================

drop table if exists public.payments;

alter table public.time_entries
  add column if not exists paye boolean not null default false,
  add column if not exists paye_le timestamptz,
  add column if not exists paye_par uuid references public.profiles (id);

-- La policy "time_entries_update_admin" (déjà en place depuis la
-- migration 0004) couvre déjà la mise à jour de ces nouvelles colonnes
-- par un admin — aucune nouvelle policy nécessaire.
