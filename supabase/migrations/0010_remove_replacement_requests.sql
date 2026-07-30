-- ============================================================
-- Suppression de la fonctionnalité "demande de remplacement"
-- (la table notifications, créée dans la même migration 0006,
-- reste en place car utilisée pour d'autres événements)
-- ============================================================

drop function if exists public.request_shift_replacement(uuid);

alter table public.shifts
  drop column if exists remplacement_demande;
