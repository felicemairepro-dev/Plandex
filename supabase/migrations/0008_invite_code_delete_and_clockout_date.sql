-- ============================================================
-- Permet à un admin de supprimer un code d'invitation existant.
-- ============================================================

create policy "invite_codes_delete_admin"
  on public.invite_codes for delete
  using (public.is_admin(auth.uid()));

-- ============================================================
-- Le pointage de départ doit lui aussi être limité au jour du
-- créneau (jusqu'ici seul clock_in vérifiait la date, clock_out
-- pouvait être appelé n'importe quel jour).
-- ============================================================

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
  if v_shift.date <> current_date then
    raise exception 'Ce créneau n''est pas prévu aujourd''hui.';
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
