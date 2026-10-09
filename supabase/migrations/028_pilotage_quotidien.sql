-- ============================================================================
-- Bâtisseur — migration : pilotage quotidien (Lot 1)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- 1. daily_activity : compteurs du jour (DV/DR planifiés/réalisés, recomm.,
--    dossiers) à côté des 5 piliers déjà présents.
-- 2. prospects.updated_at (+ trigger) : "ventes sans mise à jour depuis X j".
-- 3. clients.last_contact_at : "clients à réactiver (+3 mois sans contact)".
-- 4. monthly_engagements : objectif d'unités / de recrues du mois, par personne.
-- 5. get_team_numbers() / get_team_engagements() : agrégats de toute la
--    cascade sous la personne connectée (admin = racine, voit tout), même
--    logique d'autorisation que get_team_production().
-- ============================================================================

-- 1 ------------------------------------------------------------------------
alter table public.daily_activity
  add column if not exists dv_planifies integer not null default 0,
  add column if not exists dv_realises integer not null default 0,
  add column if not exists dr_planifies integer not null default 0,
  add column if not exists dr_realises integer not null default 0,
  add column if not exists recomm_dv integer not null default 0,
  add column if not exists recomm_dr integer not null default 0,
  add column if not exists dossiers integer not null default 0;

-- 2 ------------------------------------------------------------------------
alter table public.prospects
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prospects_touch_updated_at on public.prospects;
create trigger prospects_touch_updated_at
  before update on public.prospects
  for each row execute function public.touch_updated_at();

-- 3 ------------------------------------------------------------------------
alter table public.clients
  add column if not exists last_contact_at timestamptz;

-- 4 ------------------------------------------------------------------------
create table if not exists public.monthly_engagements (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  objectif_unites numeric not null default 0,
  objectif_recrues integer not null default 0,
  created_at timestamptz not null default now(),
  unique (person_id, month)
);

alter table public.monthly_engagements enable row level security;

create policy "monthly_engagements_own" on public.monthly_engagements
  for all using (person_id = current_person_id())
  with check (person_id = current_person_id());

grant select, insert, update, delete on public.monthly_engagements to authenticated;

-- 5 ------------------------------------------------------------------------
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
begin
  return query
  with recursive tree as (
    select p.id, p.name, p.rank, p.reports_to, 0 as depth
    from public.people p
    where p.id = root
    union all
    select c.id, c.name, c.rank, c.reports_to, t.depth + 1
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
  order by t.depth, t.name;
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
begin
  return query
  with recursive tree as (
    select p.id, p.name, 0 as depth
    from public.people p
    where p.id = root
    union all
    select c.id, c.name, t.depth + 1
    from public.people c
    join tree t on c.reports_to = t.id
  )
  select t.id, t.name, t.depth, coalesce(e.objectif_unites, 0), coalesce(e.objectif_recrues, 0)
  from tree t
  left join public.monthly_engagements e on e.person_id = t.id and e.month = p_month
  order by t.depth, t.name;
end;
$$;

grant execute on function public.get_team_numbers(date, date) to authenticated;
grant execute on function public.get_team_engagements(text) to authenticated;
