-- Distingue un compte supprimé d'un compte simplement désactivé.
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
alter table public.profiles
  add column if not exists supprime boolean not null default false;
