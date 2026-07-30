-- ============================================================
-- Le pointage d'arrivée ne peut se faire qu'à partir de 10 minutes
-- avant l'heure prévue du créneau (aucune limite après : ça permet
-- de voir le retard éventuel). Le pointage de départ reste libre.
-- ============================================================

create or replace function public.clock_in(p_shift_id uuid)
returns public.time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.time_entries;
  v_shift public.shifts;
  v_allowed_from time;
begin
  select * into v_shift from public.shifts where id = p_shift_id;

  if v_shift is null or v_shift.extra_id <> auth.uid() then
    raise exception 'Créneau introuvable.';
  end if;
  if v_shift.date <> current_date then
    raise exception 'Ce créneau n''est pas prévu aujourd''hui.';
  end if;

  v_allowed_from := v_shift.heure_debut - interval '10 minutes';
  if now()::time < v_allowed_from then
    raise exception 'Vous pourrez pointer votre arrivée à partir de %.',
      to_char(v_allowed_from, 'HH24:MI');
  end if;

  insert into public.time_entries (shift_id, extra_id, heure_arrivee)
  values (p_shift_id, auth.uid(), now())
  on conflict (shift_id) do update
    set heure_arrivee = coalesce(public.time_entries.heure_arrivee, excluded.heure_arrivee)
  returning * into result;

  return result;
end;
$$;
