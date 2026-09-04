-- ============================================================================
-- Bâtisseur — migration : périodes OVB décalées (le "mois" ne commence pas
-- forcément le 1er du mois calendaire).
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Ajoute :
--   1. ovb_periods : date de début réelle d'un "mois OVB", configurable par
--      l'admin, mois par mois (ex. la période "2026-09" a commencé le 12).
--   2. ovb_period_for_date() : classe une date dans le bon mois OVB — si
--      aucune période n'est configurée, retombe sur le mois calendaire
--      (comportement identique à aujourd'hui).
--   3. Adapte get_team_production, get_company_ranking et
--      get_person_monthly_production pour utiliser cette classification au
--      lieu du mois calendaire strict.
--   4. Adapte import_ovb_contracts pour ancrer un contrat importé dans la
--      bonne période plutôt que toujours le 1er du mois.
-- ============================================================================

create table public.ovb_periods (
  id uuid primary key default gen_random_uuid(),
  period_month text not null unique, -- 'YYYY-MM'
  start_date date not null,
  created_at timestamptz not null default now()
);

alter table public.ovb_periods enable row level security;

create policy "ovb_periods_select" on public.ovb_periods
  for select using (true);

create policy "ovb_periods_write" on public.ovb_periods
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on public.ovb_periods to authenticated;

create or replace function public.ovb_period_for_date(d timestamptz)
returns text
language sql
stable
as $$
  select coalesce(
    (select period_month from public.ovb_periods where start_date <= d::date order by start_date desc limit 1),
    to_char(d, 'YYYY-MM')
  )
$$;

grant execute on function public.ovb_period_for_date(timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- get_team_production : "ce mois-ci" utilise désormais la période OVB.
-- ----------------------------------------------------------------------------
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
        where public.ovb_period_for_date(cp.created_at) = public.ovb_period_for_date(now())
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

-- ----------------------------------------------------------------------------
-- get_company_ranking : idem.
-- ----------------------------------------------------------------------------
create or replace function public.get_company_ranking()
returns table (
  person_id uuid,
  name text,
  rank text,
  units_this_month numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.rank,
    coalesce(sum(cp.units) filter (
      where public.ovb_period_for_date(cp.created_at) = public.ovb_period_for_date(now())
    ), 0) as units_this_month
  from public.people p
  left join public.clients cl on cl.owner_id = p.id
  left join public.client_policies cp on cp.client_id = cl.id
  where p.active = true
  group by p.id, p.name, p.rank
  order by units_this_month desc;
$$;

grant execute on function public.get_company_ranking() to authenticated;

-- ----------------------------------------------------------------------------
-- get_person_monthly_production : classe chaque police par période OVB au
-- lieu du mois calendaire strict.
-- ----------------------------------------------------------------------------
create or replace function public.get_person_monthly_production(target_id uuid)
returns table (
  month text,
  units numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  start_month date;
begin
  if target_id <> public.current_person_id()
     and not public.is_admin()
     and not public.is_downline_of(target_id, public.current_person_id()) then
    raise exception 'not authorized to view this history';
  end if;

  select date_trunc('month', p.created_at)::date into start_month
  from public.people p
  where p.id = target_id;

  if start_month is null then
    start_month := date_trunc('month', now())::date;
  end if;

  return query
  select
    to_char(d.month, 'YYYY-MM') as month,
    coalesce(sum(cp.units), 0) as units
  from generate_series(start_month, date_trunc('month', now())::date, interval '1 month') d(month)
  left join public.clients cl on cl.owner_id = target_id
  left join public.client_policies cp
    on cp.client_id = cl.id
    and public.ovb_period_for_date(cp.created_at) = to_char(d.month, 'YYYY-MM')
  group by d.month
  order by d.month;
end;
$$;

grant execute on function public.get_person_monthly_production(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- import_ovb_contracts : ancre un contrat importé dans la vraie période
-- configurée (si elle existe) plutôt que toujours le 1er du mois.
-- ----------------------------------------------------------------------------
create or replace function public.import_ovb_contracts(payload jsonb, do_commit boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  owner uuid;
  v_client_id uuid;
  matched_policy_id uuid;
  claimed_ids uuid[] := '{}';
  created_clients int := 0;
  matched_count int := 0;
  created_policies int := 0;
  unmatched_collab text[] := '{}';
  month_date date;
begin
  if session_user <> 'postgres' and not public.is_admin() then
    raise exception 'admin only';
  end if;

  for row_data in select * from jsonb_array_elements(payload)
  loop
    owner := null;
    v_client_id := null;
    matched_policy_id := null;

    select p.id into owner
    from public.people p
    where public.name_tokens(p.name) = public.name_tokens(row_data->>'collaborateur')
    limit 1;

    if owner is null then
      unmatched_collab := array_append(unmatched_collab, row_data->>'collaborateur');
      continue;
    end if;

    select coalesce(
      (select start_date from public.ovb_periods where period_month = row_data->>'mois'),
      to_date(row_data->>'mois', 'YYYY-MM')
    ) into month_date;

    select c.id into v_client_id
    from public.clients c
    where c.owner_id = owner
      and public.name_tokens(c.name) = public.name_tokens(row_data->>'client')
    limit 1;

    if v_client_id is null then
      created_clients := created_clients + 1;
      if do_commit then
        insert into public.clients (owner_id, name, status)
        values (owner, row_data->>'client', 'Client')
        returning id into v_client_id;
      end if;
    end if;

    if v_client_id is not null then
      select cp.id into matched_policy_id
      from public.client_policies cp
      where cp.client_id = v_client_id
        and abs(cp.worth - (row_data->>'montant')::numeric) < 0.01
        and abs(cp.units - (row_data->>'unites')::numeric) < 0.01
        and cp.id <> all(claimed_ids)
      limit 1;
    end if;

    if matched_policy_id is not null then
      claimed_ids := array_append(claimed_ids, matched_policy_id);
      matched_count := matched_count + 1;
      if do_commit then
        update public.client_policies
        set created_at = month_date, source = 'ovb'
        where id = matched_policy_id;
      end if;
    else
      created_policies := created_policies + 1;
      if do_commit and v_client_id is not null then
        insert into public.client_policies
          (client_id, partner, product_label, worth, units, created_at, source)
        values (
          v_client_id,
          row_data->>'partenaire',
          row_data->>'produit',
          (row_data->>'montant')::numeric,
          (row_data->>'unites')::numeric,
          month_date,
          'ovb'
        );
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'matched', matched_count,
    'created_policies', created_policies,
    'created_clients', created_clients,
    'unmatched_collaborators', to_jsonb(unmatched_collab),
    'committed', do_commit
  );
end;
$$;

grant execute on function public.import_ovb_contracts(jsonb, boolean) to authenticated;
