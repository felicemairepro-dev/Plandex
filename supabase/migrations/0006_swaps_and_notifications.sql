-- ============================================================
-- SHIFTS : demande de remplacement
-- ============================================================

alter table public.shifts
  add column if not exists remplacement_demande boolean not null default false;

-- ============================================================
-- NOTIFICATIONS : évènements internes (cloche dans le header)
-- ============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  lu boolean not null default false,
  cree_le timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Permet à l'utilisateur de marquer ses propres notifications comme lues
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Un admin peut notifier n'importe quel utilisateur (ex: nouveau créneau assigné)
create policy "notifications_insert_admin"
  on public.notifications for insert
  with check (public.is_admin(auth.uid()));

-- ============================================================
-- RPC : un extra demande un remplacement sur l'un de ses créneaux
-- ============================================================

create or replace function public.request_shift_replacement(p_shift_id uuid)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.shifts;
  v_admin record;
  v_extra_name text;
begin
  select * into result from public.shifts where id = p_shift_id;

  if result is null or result.extra_id <> auth.uid() then
    raise exception 'Créneau introuvable.';
  end if;
  if result.date < current_date then
    raise exception 'Ce créneau est déjà passé.';
  end if;
  if result.statut <> 'confirme' then
    raise exception 'Seul un créneau confirmé peut faire l''objet d''une demande de remplacement.';
  end if;

  update public.shifts
  set remplacement_demande = true
  where id = p_shift_id
  returning * into result;

  select full_name into v_extra_name from public.profiles where id = auth.uid();

  for v_admin in select id from public.profiles where role = 'admin' loop
    insert into public.notifications (user_id, message)
    values (
      v_admin.id,
      coalesce(v_extra_name, 'Un extra') || ' demande un remplacement pour le créneau du ' ||
        to_char(result.date, 'DD/MM/YYYY') || ' (' || result.poste || ')'
    );
  end loop;

  return result;
end;
$$;

grant execute on function public.request_shift_replacement(uuid) to authenticated;
