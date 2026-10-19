-- ============================================================================
-- Bâtisseur — migration : suppression des candidatures après 12 mois sans suite
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Le texte de consentement du formulaire promet : « supprimées après 12 mois sans suite ».
-- Règle : une candidature dont la dernière étape date de plus de 12 mois et qui n'a pas
-- abouti (ni Retenu, ni Intégré, ni Actif 90 j) est supprimée. Les candidats retenus ou
-- devenus collaborateurs ne sont jamais touchés. Exécution chaque jour à 03:00 (UTC).

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
      and greatest(created_at, stage_changed_at) < now() - interval '12 months'
    returning 1
  )
  select count(*) into deleted from gone;
  return deleted;
end;
$$;

revoke all on function public.purge_old_recruitment_applications() from public, anon, authenticated;
grant execute on function public.purge_old_recruitment_applications() to service_role;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'recruitment-purge-12-months',
  '0 3 * * *',
  $cmd$select public.purge_old_recruitment_applications()$cmd$
);
