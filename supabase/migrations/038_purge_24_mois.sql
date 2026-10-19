-- ============================================================================
-- Bâtisseur — migration : la suppression des candidatures passe de 12 à 24 mois
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Remplace la fonction de la migration 037 (le job pg_cron quotidien reste le même).
-- Texte de consentement et page /confidentialite : « supprimées après 24 mois sans suite ».

create or replace function public.purge_old_recruitment_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  with gone as (
    delete from public.recruitment_applications
    where status in ('Nouveau', 'Contacté', 'Entretien planifié', 'Rejeté', 'Sans suite', 'Non éligible')
      and greatest(created_at, stage_changed_at) < now() - interval '24 months'
    returning 1
  )
  select count(*) into deleted from gone;
  return deleted;
end;
$$;
