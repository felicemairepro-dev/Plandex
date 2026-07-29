-- Extensions nécessaires
create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES : ajout des champs nécessaires à la gestion d'équipe
-- ============================================================

alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists actif boolean not null default true;

-- Recrée la fonction de création automatique de profil pour y inclure
-- l'email, le téléphone et le statut actif dès la création du compte.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role, actif)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'extra'),
    true
  );
  return new;
end;
$$;

-- ============================================================
-- SHIFTS : créneaux de planning
-- ============================================================

create type public.shift_status as enum ('propose', 'confirme', 'annule');

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  lieu text not null,
  poste text not null,
  extra_id uuid not null references public.profiles (id) on delete cascade,
  statut public.shift_status not null default 'propose',
  cree_par uuid not null references public.profiles (id),
  cree_le timestamptz not null default now()
);

create index shifts_extra_id_idx on public.shifts (extra_id);
create index shifts_date_idx on public.shifts (date);

alter table public.shifts enable row level security;

-- Un extra ne voit que ses propres créneaux
create policy "shifts_select_own"
  on public.shifts for select
  using (auth.uid() = extra_id);

-- Un admin voit tous les créneaux
create policy "shifts_select_admin"
  on public.shifts for select
  using (public.is_admin(auth.uid()));

-- Seul un admin peut créer, modifier ou supprimer des créneaux
create policy "shifts_insert_admin"
  on public.shifts for insert
  with check (public.is_admin(auth.uid()));

create policy "shifts_update_admin"
  on public.shifts for update
  using (public.is_admin(auth.uid()));

create policy "shifts_delete_admin"
  on public.shifts for delete
  using (public.is_admin(auth.uid()));
