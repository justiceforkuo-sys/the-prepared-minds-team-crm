-- ============================================================================
-- Bâtisseur — schéma Postgres/Supabase
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
--
-- Note d'architecture : le spec d'origine prévoyait `people.id = auth.users.id`
-- (un compte Auth par personne, créé en même temps que la ligne `people`).
-- En pratique, un sponsor doit pouvoir enregistrer une nouvelle recrue AVANT
-- que celle-ci ait créé son compte (elle n'a pas encore de mot de passe).
-- On sépare donc :
--   - people.id          : identifiant interne stable (gen_random_uuid)
--   - people.auth_user_id: lié à auth.users.id UNE FOIS que la personne a
--                          créé son compte (email + mot de passe), via un
--                          trigger qui fait le lien automatiquement par email.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  rank text not null default 'JFAI'
    check (rank in ('JFAI','JFAII','JFAIII','FA','FC','CD','CR','CN')),
  active boolean not null default true,
  reports_to uuid references public.people (id) on delete set null,
  phone text,
  email text,
  is_admin boolean not null default false,
  personal_pts numeric not null default 0,
  team_quarterly_pts numeric not null default 0,
  directs_count numeric not null default 0,
  notes text,
  vision text,
  ranking_position integer,
  ranking_points integer,
  ranking_days_to_promo integer,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people (id) on delete cascade,
  name text not null,
  status text not null default 'Client' check (status in ('Client','Prospect')),
  email text,
  phone text,
  address text,
  locality text,
  total_worth numeric not null default 0,
  total_units numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.client_policies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  partner text,
  product text,
  product_label text,
  worth numeric not null default 0,
  units numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people (id) on delete cascade,
  name text not null,
  phone text,
  source text,
  notes text,
  stage text not null default 'Contact'
    check (stage in ('Contact','Invité','Présentation faite','Suivi','Partenaire','Perdu')),
  priority text not null default 'B' check (priority in ('A','B','C')),
  next_follow_up date,
  product_id text,
  montant numeric,
  created_at timestamptz not null default now()
);

create table public.removal_requests (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.people (id) on delete cascade,
  requested_by uuid not null references public.people (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  step_id text not null,
  done_by_self boolean not null default false,
  done_date date,
  validated_by_sponsor boolean not null default false,
  validated_date date,
  unique (person_id, step_id)
);

create table public.formation_progress (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  module_id text not null,
  done boolean not null default false,
  done_date date,
  unique (person_id, module_id)
);

create table public.units_by_month (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  units numeric not null default 0,
  unique (person_id, month)
);

create table public.payout_history (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  a_pro numeric not null default 0,
  sto_res numeric not null default 0,
  autre numeric not null default 0,
  payout numeric not null default 0,
  unique (person_id, month)
);

create table public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  date date not null,
  prospection boolean not null default false,
  invitation boolean not null default false,
  formation boolean not null default false,
  vision_pillar boolean not null default false,
  etat_esprit boolean not null default false,
  minutes integer not null default 0,
  unique (person_id, date)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  text text not null,
  done boolean not null default false,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

create function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.people where auth_user_id = auth.uid()
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.people where auth_user_id = auth.uid()),
    false
  )
$$;

-- Lie automatiquement une ligne `people` (créée à l'avance par le sponsor,
-- avec le bon email) au compte Auth créé lors de l'inscription.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.people
  set auth_user_id = new.id
  where lower(email) = lower(new.email) and auth_user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Est-ce que target_id est quelque part dans la cascade sous root_id ?
-- Utilisé par get_team_production() pour vérifier qu'un sponsor ne peut voir
-- que sa propre sous-équipe (l'admin voit tout via is_admin()).
create function public.is_downline_of(target_id uuid, root_id uuid)
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

-- Production (en unités) de toute la cascade sous une personne (par défaut,
-- soi-même). Même fonction pour tout le monde : un sponsor ne voit que sa
-- propre sous-équipe ; l'admin, à la racine de la pyramide, voit tout.
create function public.get_team_production(root_id uuid default null)
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

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table public.people enable row level security;
alter table public.clients enable row level security;
alter table public.client_policies enable row level security;
alter table public.prospects enable row level security;
alter table public.removal_requests enable row level security;
alter table public.onboarding_progress enable row level security;
alter table public.formation_progress enable row level security;
alter table public.units_by_month enable row level security;
alter table public.payout_history enable row level security;
alter table public.daily_activity enable row level security;
alter table public.goals enable row level security;

-- people: tout le monde authentifié peut lire l'annuaire (nécessaire pour
-- afficher la cascade et choisir un sponsor) ; chacun modifie sa propre
-- fiche, un sponsor modifie celles de ses recrues directes, l'admin modifie
-- tout. La suppression n'existe pas côté client (passe par removal_requests).
create policy "people_select_all" on public.people
  for select using (auth.role() = 'authenticated');

create policy "people_insert_self_or_admin" on public.people
  for insert with check (
    is_admin() or reports_to = current_person_id()
  );

create policy "people_update_self_sponsor_or_admin" on public.people
  for update using (
    id = current_person_id()
    or reports_to = current_person_id()
    or is_admin()
  );

-- clients: book personnel + lecture seule pour le sponsor direct
create policy "clients_select_own_or_downline" on public.clients
  for select using (
    owner_id = current_person_id()
    or owner_id in (select id from public.people where reports_to = current_person_id())
    or is_admin()
  );

create policy "clients_insert_own" on public.clients
  for insert with check (owner_id = current_person_id());

create policy "clients_update_own" on public.clients
  for update using (owner_id = current_person_id());

create policy "clients_delete_own" on public.clients
  for delete using (owner_id = current_person_id());

-- client_policies: suit la visibilité du client parent
create policy "client_policies_select" on public.client_policies
  for select using (
    exists (
      select 1 from public.clients c
      where c.id = client_policies.client_id
      and (
        c.owner_id = current_person_id()
        or c.owner_id in (select id from public.people where reports_to = current_person_id())
        or is_admin()
      )
    )
  );

create policy "client_policies_modify" on public.client_policies
  for all using (
    exists (
      select 1 from public.clients c
      where c.id = client_policies.client_id and c.owner_id = current_person_id()
    )
  ) with check (
    exists (
      select 1 from public.clients c
      where c.id = client_policies.client_id and c.owner_id = current_person_id()
    )
  );

-- prospects: pipeline strictement personnel
create policy "prospects_own_only" on public.prospects
  for all using (owner_id = current_person_id())
  with check (owner_id = current_person_id());

-- removal_requests: le demandeur et l'admin voient ; seul l'admin approuve/rejette
create policy "removal_requests_select" on public.removal_requests
  for select using (requested_by = current_person_id() or is_admin());

create policy "removal_requests_insert" on public.removal_requests
  for insert with check (
    requested_by = current_person_id()
    and exists (
      select 1 from public.people
      where id = target_id and reports_to = current_person_id()
    )
  );

create policy "removal_requests_update_admin" on public.removal_requests
  for update using (is_admin());

create policy "removal_requests_delete_admin" on public.removal_requests
  for delete using (is_admin());

-- onboarding_progress: la personne + son sponsor direct (pour valider) + admin
create policy "onboarding_select" on public.onboarding_progress
  for select using (
    person_id = current_person_id()
    or person_id in (select id from public.people where reports_to = current_person_id())
    or is_admin()
  );

create policy "onboarding_insert_self" on public.onboarding_progress
  for insert with check (person_id = current_person_id());

create policy "onboarding_update_self_or_sponsor" on public.onboarding_progress
  for update using (
    person_id = current_person_id()
    or person_id in (select id from public.people where reports_to = current_person_id())
    or is_admin()
  );

-- formation_progress: personnel
create policy "formation_own_only" on public.formation_progress
  for all using (person_id = current_person_id())
  with check (person_id = current_person_id());

-- units_by_month: la personne + son sponsor direct (calcul du revenu d'équipe) + admin
create policy "units_select" on public.units_by_month
  for select using (
    person_id = current_person_id()
    or person_id in (select id from public.people where reports_to = current_person_id())
    or is_admin()
  );

create policy "units_modify_own" on public.units_by_month
  for insert with check (person_id = current_person_id());

create policy "units_update_own" on public.units_by_month
  for update using (person_id = current_person_id());

-- payout_history: personnel + admin
create policy "payout_own_or_admin" on public.payout_history
  for all using (person_id = current_person_id() or is_admin())
  with check (person_id = current_person_id() or is_admin());

-- daily_activity: strictement personnel
create policy "daily_activity_own_only" on public.daily_activity
  for all using (person_id = current_person_id())
  with check (person_id = current_person_id());

-- goals: strictement personnel
create policy "goals_own_only" on public.goals
  for all using (person_id = current_person_id())
  with check (person_id = current_person_id());

-- ----------------------------------------------------------------------------
-- Grants (PostgREST expose le schéma public au rôle `authenticated`)
-- ----------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
grant execute on function public.get_team_production(uuid) to authenticated;
grant execute on function public.is_downline_of(uuid, uuid) to authenticated;
