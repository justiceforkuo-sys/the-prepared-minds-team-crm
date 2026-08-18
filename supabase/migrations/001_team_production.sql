-- ============================================================================
-- Bâtisseur — migration : production récursive d'équipe
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Ajoute :
--   1. client_policies.created_at, pour pouvoir filtrer la production du mois.
--   2. is_downline_of() : est-ce que target_id est dans la cascade sous root_id ?
--   3. get_team_production() : production (unités) de toute la cascade sous une
--      personne, avec autorisation (soi-même, sa propre cascade, ou admin).
--      Mêmes fonctions pour tout le monde : un sponsor ne voit que sa propre
--      sous-équipe, l'admin (racine de la pyramide) voit tout naturellement.
-- ============================================================================

alter table public.client_policies
  add column if not exists created_at timestamptz not null default now();

create or replace function public.is_downline_of(target_id uuid, root_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive tree as (
    select id from public.people where id = root_id
    union all
    select c.id from public.people c join tree t on c.reports_to = t.id
  )
  select exists (select 1 from tree where id = target_id)
$$;

create or replace function public.get_team_production(root_id uuid default null)
returns table (
  person_id uuid,
  name text,
  rank text,
  depth int,
  active boolean,
  units_total numeric,
  units_this_month numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  effective_root uuid := coalesce(root_id, public.current_person_id());
begin
  if effective_root <> public.current_person_id()
     and not public.is_admin()
     and not public.is_downline_of(effective_root, public.current_person_id()) then
    raise exception 'not authorized to view this team';
  end if;

  return query
  with recursive tree as (
    select p.id, p.name, p.rank, p.active, 0 as depth
    from public.people p
    where p.id = effective_root
    union all
    select c.id, c.name, c.rank, c.active, t.depth + 1
    from public.people c
    join tree t on c.reports_to = t.id
  ),
  prod as (
    select
      cl.owner_id,
      sum(cp.units) as units_total,
      sum(cp.units) filter (
        where to_char(cp.created_at, 'YYYY-MM') = to_char(now(), 'YYYY-MM')
      ) as units_this_month
    from public.clients cl
    join public.client_policies cp on cp.client_id = cl.id
    group by cl.owner_id
  )
  select
    t.id,
    t.name,
    t.rank,
    t.depth,
    t.active,
    coalesce(p.units_total, 0),
    coalesce(p.units_this_month, 0)
  from tree t
  left join prod p on p.owner_id = t.id
  order by t.depth, t.name;
end;
$$;

grant execute on function public.get_team_production(uuid) to authenticated;
grant execute on function public.is_downline_of(uuid, uuid) to authenticated;
