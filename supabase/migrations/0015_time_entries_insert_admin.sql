-- ============================================================
-- Permet à un admin de créer directement un pointage (time_entries)
-- pour un créneau qui n'en a encore aucun, sans passer par clock_in.
-- Jusqu'ici, seul un update était autorisé pour un admin (migration
-- 0004) ; un insert via le client normal était systématiquement
-- bloqué par RLS, faute de policy insert correspondante.
-- ============================================================

create policy "time_entries_insert_admin"
  on public.time_entries for insert
  with check (public.is_admin(auth.uid()));
