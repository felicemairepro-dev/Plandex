-- ============================================================
-- PAYMENTS : suivi des paiements mensuels versés à chaque extra
-- ============================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  extra_id uuid not null references public.profiles (id) on delete cascade,
  mois date not null,
  montant numeric(10, 2) not null,
  paye_le timestamptz not null default now(),
  paye_par uuid not null references public.profiles (id),
  unique (extra_id, mois)
);

create index payments_extra_id_idx on public.payments (extra_id);

alter table public.payments enable row level security;

create policy "payments_select_own"
  on public.payments for select
  using (auth.uid() = extra_id);

create policy "payments_select_admin"
  on public.payments for select
  using (public.is_admin(auth.uid()));

create policy "payments_insert_admin"
  on public.payments for insert
  with check (public.is_admin(auth.uid()));

create policy "payments_delete_admin"
  on public.payments for delete
  using (public.is_admin(auth.uid()));
