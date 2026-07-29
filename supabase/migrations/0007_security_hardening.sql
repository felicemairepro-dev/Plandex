-- ============================================================
-- SÉCURITÉ : empêche un utilisateur non-admin de s'auto-promouvoir
-- ============================================================
--
-- La policy "profiles_update_own" (migration 0001) autorise un
-- utilisateur à modifier SA PROPRE ligne, mais ne restreint pas quelles
-- colonnes il peut changer. Sans ce trigger, un extra pourrait, via un
-- appel direct à l'API REST Supabase (en dehors de l'interface),
-- passer son propre "role" à 'admin' ou réactiver son compte
-- ("actif" = true) lui-même. Ce trigger bloque ces deux colonnes pour
-- quiconque n'est pas déjà admin — la modification par un admin
-- (profiles_update_admin) reste inchangée.

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    if new.role is distinct from old.role then
      raise exception 'Seul un administrateur peut modifier le rôle.';
    end if;
    if new.actif is distinct from old.actif then
      raise exception 'Seul un administrateur peut activer/désactiver un compte.';
    end if;
  end if;
  return new;
end;
$$;

create trigger prevent_privilege_escalation_trigger
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();
