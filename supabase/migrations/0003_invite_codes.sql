-- ============================================================
-- INVITE_CODES : codes d'invitation pour l'auto-inscription des extras
-- ============================================================

create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  utilise boolean not null default false,
  cree_par uuid not null references public.profiles (id),
  cree_le timestamptz not null default now(),
  expire_le timestamptz
);

alter table public.invite_codes enable row level security;

-- Seul un admin peut lister/consulter directement les codes
create policy "invite_codes_select_admin"
  on public.invite_codes for select
  using (public.is_admin(auth.uid()));

-- Aucune policy insert/update publique : toute écriture passe par les
-- fonctions SECURITY DEFINER ci-dessous, qui appliquent leurs propres règles.

-- Génère un code court et lisible, ex: "PLDX-4K9X"
-- (alphabet sans caractères ambigus : pas de O/0, I/1)
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  suffix text;
  i int;
begin
  loop
    suffix := '';
    for i in 1..4 loop
      suffix := suffix || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    new_code := 'PLDX-' || suffix;
    exit when not exists (select 1 from public.invite_codes where code = new_code);
  end loop;
  return new_code;
end;
$$;

-- RPC admin : crée un nouveau code d'invitation
create or replace function public.create_invite_code()
returns public.invite_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.invite_codes;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Accès refusé.';
  end if;

  insert into public.invite_codes (code, cree_par)
  values (public.generate_invite_code(), auth.uid())
  returning * into result;

  return result;
end;
$$;

-- RPC publique : vérifie qu'un code est valide, sans le consommer et
-- sans exposer la table (utilisée par la page /rejoindre, étape 1)
create or replace function public.check_invite_code(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invite_codes
    where code = p_code
      and utilise = false
      and (expire_le is null or expire_le > now())
  );
$$;

-- RPC publique : consomme atomiquement un code (empêche toute réutilisation
-- même en cas de double soumission simultanée)
create or replace function public.claim_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  update public.invite_codes
  set utilise = true
  where code = p_code
    and utilise = false
    and (expire_le is null or expire_le > now());

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

-- RPC publique : relibère un code si la création du compte échoue après
-- qu'il ait été consommé (évite de gâcher un code sur une erreur technique)
create or replace function public.release_invite_code(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.invite_codes set utilise = false where code = p_code;
$$;

grant execute on function public.create_invite_code() to authenticated;
grant execute on function public.check_invite_code(text) to anon, authenticated;
grant execute on function public.claim_invite_code(text) to anon, authenticated;
grant execute on function public.release_invite_code(text) to anon, authenticated;
