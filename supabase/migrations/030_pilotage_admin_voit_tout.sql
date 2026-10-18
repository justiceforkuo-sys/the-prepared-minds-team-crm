-- ============================================================================
-- Bâtisseur — migration : pilotage quotidien, l'admin voit toute la structure
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Correctif de 028 : get_team_numbers() et get_team_engagements() partaient
-- toujours de la personne connectée. Avec plusieurs racines admin (pyramides
-- séparées), chaque admin ne voyait que sa propre cascade.
--   - admin  : part de toutes les personnes sans sponsor -> voit tout le monde
--   - autres : inchangé, uniquement leur propre cascade
-- Le tri suit maintenant l'arborescence (chaque collaborateur sous son sponsor)
-- au lieu d'un tri par profondeur puis par nom.
-- ============================================================================

create or replace function public.get_team_numbers(p_start date, p_end date)
returns table (
  person_id uuid,
  name text,
  rank text,
  depth int,
  coach_name text,
  dv_planifies bigint,
  dv_realises bigint,
  dr_planifies bigint,
  dr_realises bigint,
  recomm_dv bigint,
  recomm_dr bigint,
  dossiers bigint,
  units numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  root uuid := public.current_person_id();
  see_all boolean := public.is_admin();
begin
  return query
  with recursive tree as (
    select p.id, p.name, p.rank, p.reports_to, 0 as depth, p.name::text as sort_path
    from public.people p
    where (see_all and p.reports_to is null)
       or (not see_all and p.id = root)
    union all
    select c.id, c.name, c.rank, c.reports_to, t.depth + 1, t.sort_path || '>' || c.name
    from public.people c
    join tree t on c.reports_to = t.id
  ),
  act as (
    select
      da.person_id,
      sum(da.dv_planifies) as dv_planifies,
      sum(da.dv_realises) as dv_realises,
      sum(da.dr_planifies) as dr_planifies,
      sum(da.dr_realises) as dr_realises,
      sum(da.recomm_dv) as recomm_dv,
      sum(da.recomm_dr) as recomm_dr,
      sum(da.dossiers) as dossiers
    from public.daily_activity da
    where da.date between p_start and p_end
    group by da.person_id
  ),
  prod as (
    select cl.owner_id, sum(cp.units) as units
    from public.clients cl
    join public.client_policies cp on cp.client_id = cl.id
    where cp.created_at::date between p_start and p_end
    group by cl.owner_id
  )
  select
    t.id,
    t.name,
    t.rank,
    t.depth,
    coach.name,
    coalesce(a.dv_planifies, 0)::bigint,
    coalesce(a.dv_realises, 0)::bigint,
    coalesce(a.dr_planifies, 0)::bigint,
    coalesce(a.dr_realises, 0)::bigint,
    coalesce(a.recomm_dv, 0)::bigint,
    coalesce(a.recomm_dr, 0)::bigint,
    coalesce(a.dossiers, 0)::bigint,
    coalesce(pr.units, 0)
  from tree t
  left join public.people coach on coach.id = t.reports_to
  left join act a on a.person_id = t.id
  left join prod pr on pr.owner_id = t.id
  order by t.sort_path;
end;
$$;

create or replace function public.get_team_engagements(p_month text)
returns table (
  person_id uuid,
  name text,
  depth int,
  objectif_unites numeric,
  objectif_recrues integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  root uuid := public.current_person_id();
  see_all boolean := public.is_admin();
begin
  return query
  with recursive tree as (
    select p.id, p.name, 0 as depth, p.name::text as sort_path
    from public.people p
    where (see_all and p.reports_to is null)
       or (not see_all and p.id = root)
    union all
    select c.id, c.name, t.depth + 1, t.sort_path || '>' || c.name
    from public.people c
    join tree t on c.reports_to = t.id
  )
  select t.id, t.name, t.depth, coalesce(e.objectif_unites, 0), coalesce(e.objectif_recrues, 0)
  from tree t
  left join public.monthly_engagements e on e.person_id = t.id and e.month = p_month
  order by t.sort_path;
end;
$$;

grant execute on function public.get_team_numbers(date, date) to authenticated;
grant execute on function public.get_team_engagements(text) to authenticated;
