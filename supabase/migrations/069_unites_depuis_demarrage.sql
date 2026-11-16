-- Unités du parcours : comptées depuis le démarrage réel quand il précède la date d'intégration
-- (collaborateurs avec un parcours antérieur : leurs contrats d'avant l'intégration comptent aussi pour les 1 000 unités).
-- Seule la colonne `units` / `units_7d` change ; le reste de la fonction est identique à la migration 039.
create or replace function public.parcours_cohort()
returns table (
  person_id uuid,
  name text,
  rank text,
  mentor_id uuid,
  mentor_name text,
  integration_date date,
  day_n integer,
  units numeric,
  units_7d numeric,
  dv_plan_total bigint,
  dv_real_total bigint,
  dv_plan_week bigint,
  dv_real_week bigint,
  dv_plan_j5_j7 bigint,
  recomm_total bigint,
  prospects_classes bigint,
  figures_days_week bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := public.current_person_id();
  today date := public.linkedin_bxl_today();
  wk date := date_trunc('week', public.linkedin_bxl_today())::date;
begin
  if me is null then
    raise exception 'not authorized';
  end if;
  return query
  with recursive tree as (
    select p.id from public.people p where p.id = me
    union all
    select c.id from public.people c join tree t on c.reports_to = t.id
  ),
  scope as (
    select p.id, p.name as pname, p.rank as prank, p.reports_to, p.integration_date as idate,
           least(p.integration_date, coalesce(p.date_demarrage, p.integration_date)) as ustart
    from public.people p
    where p.parcours_statut = 'actif' and p.integration_date is not null
      and (public.is_admin() or p.id in (select id from tree))
  )
  select
    s.id,
    s.pname,
    s.prank,
    s.reports_to,
    m.name,
    s.idate,
    (today - s.idate + 1)::integer,
    coalesce((select sum(cp.units) from public.clients cl join public.client_policies cp on cp.client_id = cl.id
              where cl.owner_id = s.id and cp.created_at::date >= s.ustart), 0),
    coalesce((select sum(cp.units) from public.clients cl join public.client_policies cp on cp.client_id = cl.id
              where cl.owner_id = s.id and cp.created_at::date >= s.ustart and cp.created_at::date > today - 7), 0),
    coalesce((select sum(da.dv_planifies) from public.daily_activity da where da.person_id = s.id and da.date >= s.idate), 0)::bigint,
    coalesce((select sum(da.dv_realises) from public.daily_activity da where da.person_id = s.id and da.date >= s.idate), 0)::bigint,
    coalesce((select sum(da.dv_planifies) from public.daily_activity da where da.person_id = s.id and da.date >= wk), 0)::bigint,
    coalesce((select sum(da.dv_realises) from public.daily_activity da where da.person_id = s.id and da.date >= wk), 0)::bigint,
    coalesce((select sum(da.dv_planifies) from public.daily_activity da
              where da.person_id = s.id and da.date between s.idate + 4 and s.idate + 6), 0)::bigint,
    coalesce((select sum(da.recomm_dv) from public.daily_activity da where da.person_id = s.id and da.date >= s.idate), 0)::bigint,
    (select count(*) from public.prospects pr where pr.owner_id = s.id and pr.classement_liste is not null)::bigint,
    (select count(*) from public.daily_activity da
      where da.person_id = s.id and da.date >= wk and da.date < wk + 5
        and (da.dv_planifies + da.dv_realises + da.recomm_dv + da.dr_planifies + da.dr_realises + da.dossiers) > 0)::bigint
  from scope s
  left join public.people m on m.id = s.reports_to
  order by s.idate, s.pname;
end;
$$;

grant execute on function public.parcours_cohort() to authenticated;
