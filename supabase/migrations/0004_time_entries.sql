-- ============================================================
-- TIME_ENTRIES : pointages (badgage arrivée/départ)
-- ============================================================

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  extra_id uuid not null references public.profiles (id) on delete cascade,
  heure_arrivee timestamptz,
  heure_depart timestamptz,
  corrige_par_admin boolean not null default false,
  cree_le timestamptz not null default now(),
  unique (shift_id)
);

create index time_entries_extra_id_idx on public.time_entries (extra_id);

alter table public.time_entries enable row level security;

create policy "time_entries_select_own"
  on public.time_entries for select
  using (auth.uid() = extra_id);

create policy "time_entries_select_admin"
  on public.time_entries for select
  using (public.is_admin(auth.uid()));

-- Seul un admin peut corriger un pointage à la main (traçabilité via
-- corrige_par_admin, mis à jour dans l'action serveur correspondante).
create policy "time_entries_update_admin"
  on public.time_entries for update
  using (public.is_admin(auth.uid()));

-- Pas de policy insert/update pour l'extra lui-même : le pointage passe
-- exclusivement par les fonctions clock_in/clock_out ci-dessous, qui
-- garantissent que l'heure enregistrée est toujours l'heure serveur
-- (jamais une valeur envoyée par le client).

create or replace function public.clock_in(p_shift_id uuid)
returns public.time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.time_entries;
  v_shift public.shifts;
begin
  select * into v_shift from public.shifts where id = p_shift_id;

  if v_shift is null or v_shift.extra_id <> auth.uid() then
    raise exception 'Créneau introuvable.';
  end if;
  if v_shift.date <> current_date then
    raise exception 'Ce créneau n''est pas prévu aujourd''hui.';
  end if;

  insert into public.time_entries (shift_id, extra_id, heure_arrivee)
  values (p_shift_id, auth.uid(), now())
  on conflict (shift_id) do update
    set heure_arrivee = coalesce(public.time_entries.heure_arrivee, excluded.heure_arrivee)
  returning * into result;

  return result;
end;
$$;

create or replace function public.clock_out(p_shift_id uuid)
returns public.time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.time_entries;
  v_shift public.shifts;
begin
  select * into v_shift from public.shifts where id = p_shift_id;

  if v_shift is null or v_shift.extra_id <> auth.uid() then
    raise exception 'Créneau introuvable.';
  end if;

  update public.time_entries
  set heure_depart = now()
  where shift_id = p_shift_id
    and extra_id = auth.uid()
    and heure_arrivee is not null
    and heure_depart is null
  returning * into result;

  if result is null then
    raise exception 'Impossible d''enregistrer le départ.';
  end if;

  return result;
end;
$$;

grant execute on function public.clock_in(uuid) to authenticated;
grant execute on function public.clock_out(uuid) to authenticated;
