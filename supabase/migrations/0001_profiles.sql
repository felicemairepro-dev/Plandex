-- Roles applicatifs
create type public.user_role as enum ('admin', 'extra');

-- Table des profils, liée 1-1 à auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'extra',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Fonction utilitaire (SECURITY DEFINER) pour vérifier le rôle admin
-- sans provoquer de récursion dans les policies RLS.
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

-- Un utilisateur peut lire son propre profil
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Un admin peut lire tous les profils
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

-- Un utilisateur peut mettre à jour son propre profil
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Un admin peut mettre à jour tous les profils (ex: changer un rôle)
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin(auth.uid()));

-- Création automatique du profil à l'inscription d'un utilisateur
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'extra')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
