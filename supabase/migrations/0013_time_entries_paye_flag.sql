-- Ajoute un simple statut "payé" persistant sur chaque pointage.
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
alter table public.time_entries
  add column if not exists paye boolean not null default false,
  add column if not exists paye_le timestamptz;
