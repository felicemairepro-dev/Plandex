-- ============================================================
-- PROFILES : taux horaire indicatif (facturation, pas de paiement automatisé)
-- ============================================================

alter table public.profiles
  add column if not exists taux_horaire numeric(10, 2);

-- Déjà couvert par les policies existantes :
-- - profiles_select_own / profiles_select_admin (lecture)
-- - profiles_update_own / profiles_update_admin (écriture)
-- On restreint explicitement la modification de taux_horaire aux seuls
-- admins : un extra ne doit pas pouvoir fixer son propre tarif.
create or replace function public.prevent_self_taux_horaire()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) and new.taux_horaire is distinct from old.taux_horaire then
    raise exception 'Seul un administrateur peut modifier le taux horaire.';
  end if;
  return new;
end;
$$;

create trigger prevent_self_taux_horaire_trigger
  before update on public.profiles
  for each row execute function public.prevent_self_taux_horaire();
