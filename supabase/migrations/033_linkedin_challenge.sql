-- ============================================================================
-- Bâtisseur — migration : Pipeline LinkedIn, phase C (Défi + rituel du matin)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Points, série et badges se calculent TOUJOURS à partir de
-- linkedin_contact_events (pas de compteur à part -> pas de double comptage).
--   Message envoyé : 1 pt (20 comptés par jour au maximum)
--   A répondu : 3 pts · RDV fixé : 10 pts · Client / Partenaire : 25 pts
-- Une journée compte dans la série à partir de 5 messages envoyés ; seuls les
-- jours ouvrés (lun-ven, heure de Bruxelles) comptent, le week-end ne casse rien.
-- ============================================================================

create table if not exists public.linkedin_challenge (
  user_id uuid primary key references public.people (id) on delete cascade,
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  ritual_time time not null default '08:00',
  buddy_id uuid references public.people (id) on delete set null,
  email_daily boolean not null default true,
  last_email_on date
);

alter table public.linkedin_challenge enable row level security;

create policy "linkedin_challenge_own" on public.linkedin_challenge
  for all using (user_id = current_person_id())
  with check (user_id = current_person_id());

create policy "linkedin_challenge_cascade_read" on public.linkedin_challenge
  for select using (is_admin() or is_downline_of(user_id, current_person_id()));

grant select, insert, update, delete on public.linkedin_challenge to authenticated;

create table if not exists public.linkedin_team_goal (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'RDV LinkedIn ce sprint',
  target integer not null check (target > 0),
  start_date date not null,
  end_date date not null,
  reward text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.linkedin_team_goal enable row level security;
create policy "linkedin_team_goal_read" on public.linkedin_team_goal for select using (true);
create policy "linkedin_team_goal_admin_write" on public.linkedin_team_goal
  for all using (is_admin()) with check (is_admin());
grant select, insert, update, delete on public.linkedin_team_goal to authenticated;

-- Mur des victoires : réponses anonymisées partagées avec l'équipe
create table if not exists public.linkedin_wins (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.people (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);

alter table public.linkedin_wins enable row level security;
create policy "linkedin_wins_read" on public.linkedin_wins for select using (auth.role() = 'authenticated');
create policy "linkedin_wins_insert_own" on public.linkedin_wins
  for insert with check (author_id = current_person_id());
create policy "linkedin_wins_delete_own_or_admin" on public.linkedin_wins
  for delete using (author_id = current_person_id() or is_admin());
grant select, insert, delete on public.linkedin_wins to authenticated;

-- ----------------------------------------------------------------------------
-- Fonctions internes (non appelables depuis l'application)
-- ----------------------------------------------------------------------------
create or replace function public.linkedin_bxl_today()
returns date
language sql
stable
as $$ select (now() at time zone 'Europe/Brussels')::date $$;

create or replace function public.linkedin_points_internal(p_person uuid, p_start date, p_end date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with ev as (
    select e.action, e.contact_id, (e.created_at at time zone 'Europe/Brussels')::date as d
    from public.linkedin_contact_events e
    where e.owner_id = p_person
  ),
  msgs as (
    select d, count(*) as c from ev where action = 'Message envoyé' and d between p_start and p_end group by d
  )
  select
    coalesce((select sum(least(c, 20)) from msgs), 0)::integer
    + 3 * (select count(*) from ev where action = 'A répondu' and d between p_start and p_end)::integer
    + 10 * (select count(distinct contact_id) from ev where action = 'Statut : RDV fixé' and d between p_start and p_end)::integer
    + 25 * (select count(distinct contact_id) from ev where action = 'Statut : Client / Partenaire' and d between p_start and p_end)::integer
$$;

create or replace function public.linkedin_streak_internal(p_person uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  today date := public.linkedin_bxl_today();
  d date := today;
  n integer := 0;
  qualifies boolean;
  i integer;
begin
  for i in 0..400 loop
    if extract(isodow from d) in (6, 7) then
      d := d - 1;
      continue;
    end if;
    select count(*) >= 5 into qualifies
    from public.linkedin_contact_events e
    where e.owner_id = p_person
      and e.action = 'Message envoyé'
      and (e.created_at at time zone 'Europe/Brussels')::date = d;
    if qualifies then
      n := n + 1;
    elsif d <> today then
      exit;
    end if;
    d := d - 1;
  end loop;
  return n;
end;
$$;

create or replace function public.linkedin_last_action_internal(p_person uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select max((e.created_at at time zone 'Europe/Brussels')::date)
  from public.linkedin_contact_events e
  where e.owner_id = p_person and e.action = 'Message envoyé'
$$;

-- jours ouvrés écoulés depuis une date (exclue) jusqu'à aujourd'hui (inclus)
create or replace function public.linkedin_idle_weekdays(p_last date)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from generate_series(coalesce(p_last, public.linkedin_bxl_today() - 30) + 1, public.linkedin_bxl_today(), interval '1 day') g
  where extract(isodow from g) < 6
$$;

revoke all on function public.linkedin_points_internal(uuid, date, date) from public, anon, authenticated;
revoke all on function public.linkedin_streak_internal(uuid) from public, anon, authenticated;
revoke all on function public.linkedin_last_action_internal(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Résumé du défi (soi-même, ou un collaborateur de sa cascade / l'admin)
-- ----------------------------------------------------------------------------
create or replace function public.linkedin_challenge_summary(p_person uuid default null)
returns table (
  joined boolean,
  active boolean,
  ritual_time time,
  email_daily boolean,
  buddy_id uuid,
  streak integer,
  points_week integer,
  points_prev_week integer,
  points_total integer,
  today_actions integer,
  goal_label text,
  goal_target integer,
  goal_start date,
  goal_end date,
  goal_reward text,
  team_rdv integer,
  buddy_name text,
  buddy_streak integer,
  buddy_points_week integer,
  buddy_last_action date,
  buddy_idle_days integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := public.current_person_id();
  target uuid := coalesce(p_person, public.current_person_id());
  today date := public.linkedin_bxl_today();
  wk date := date_trunc('week', public.linkedin_bxl_today())::date;
  ch public.linkedin_challenge%rowtype;
  g public.linkedin_team_goal%rowtype;
  v_team_rdv integer := 0;
  v_buddy_last date;
begin
  if target <> me and not public.is_admin() and not public.is_downline_of(target, me) then
    raise exception 'not authorized';
  end if;

  select * into ch from public.linkedin_challenge c where c.user_id = target;

  select * into g from public.linkedin_team_goal t
  order by (t.end_date >= today) desc, t.end_date desc limit 1;

  if g.id is not null then
    select count(distinct e.contact_id)::integer into v_team_rdv
    from public.linkedin_contact_events e
    join public.linkedin_challenge c on c.user_id = e.owner_id and c.active
    where e.action = 'Statut : RDV fixé'
      and (e.created_at at time zone 'Europe/Brussels')::date between g.start_date and g.end_date;
  end if;

  if ch.buddy_id is not null then
    v_buddy_last := public.linkedin_last_action_internal(ch.buddy_id);
  end if;

  return query
  select
    (ch.user_id is not null),
    coalesce(ch.active, false),
    coalesce(ch.ritual_time, '08:00'::time),
    coalesce(ch.email_daily, true),
    ch.buddy_id,
    public.linkedin_streak_internal(target),
    public.linkedin_points_internal(target, wk, today),
    public.linkedin_points_internal(target, wk - 7, wk - 1),
    public.linkedin_points_internal(target, date '2000-01-01', today),
    (select count(*)::integer from public.linkedin_contact_events e
      where e.owner_id = target and e.action = 'Message envoyé'
        and (e.created_at at time zone 'Europe/Brussels')::date = today),
    g.label, g.target, g.start_date, g.end_date, g.reward, v_team_rdv,
    (select p.name from public.people p where p.id = ch.buddy_id),
    case when ch.buddy_id is null then null else public.linkedin_streak_internal(ch.buddy_id) end,
    case when ch.buddy_id is null then null else public.linkedin_points_internal(ch.buddy_id, wk, today) end,
    v_buddy_last,
    case when ch.buddy_id is null then null else public.linkedin_idle_weekdays(v_buddy_last) end;
end;
$$;

-- ----------------------------------------------------------------------------
-- Podium de la semaine : top 3 aux points + plus belle progression
-- (participants actifs uniquement, jamais de classement complet)
-- ----------------------------------------------------------------------------
create or replace function public.linkedin_podium()
returns table (rank integer, person_name text, points integer, kind text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  today date := public.linkedin_bxl_today();
  wk date := date_trunc('week', public.linkedin_bxl_today())::date;
begin
  if public.current_person_id() is null then
    raise exception 'not authorized';
  end if;

  return query
  with scores as (
    select c.user_id, p.name,
      public.linkedin_points_internal(c.user_id, wk, today) as pw,
      public.linkedin_points_internal(c.user_id, wk - 7, wk - 1) as pp
    from public.linkedin_challenge c
    join public.people p on p.id = c.user_id
    where c.active
  ),
  top3 as (
    select (row_number() over (order by pw desc, name))::integer as r, name, pw
    from scores where pw > 0
    order by pw desc, name limit 3
  ),
  best as (
    select name, (pw - pp) as delta from scores
    where pw > 0 and pw - pp > 0
    order by (pw - pp) desc, name limit 1
  )
  select r, name, pw, 'semaine'::text from top3
  union all
  select 1, name, delta, 'progression'::text from best;
end;
$$;

-- ----------------------------------------------------------------------------
-- Vue du responsable : participants de sa cascade (tous pour l'admin)
-- ----------------------------------------------------------------------------
create or replace function public.linkedin_team_overview()
returns table (person_id uuid, person_name text, points_week integer, streak integer, last_action date, active boolean)
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
  select c.user_id, p.name,
    public.linkedin_points_internal(c.user_id, wk, today),
    public.linkedin_streak_internal(c.user_id),
    public.linkedin_last_action_internal(c.user_id),
    c.active
  from public.linkedin_challenge c
  join public.people p on p.id = c.user_id
  where public.is_admin() or public.is_downline_of(c.user_id, me)
  order by 3 desc, p.name;
end;
$$;

-- ----------------------------------------------------------------------------
-- Badges automatiques (la Plume d'or est attribuée par l'admin à l'adoption)
-- ----------------------------------------------------------------------------
create or replace function public.linkedin_refresh_badges()
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := public.current_person_id();
  streak integer;
  earned text[] := '{}';
  b text;
  ok boolean;
begin
  if me is null or not exists (select 1 from public.linkedin_challenge c where c.user_id = me and c.active) then
    return earned;
  end if;
  streak := public.linkedin_streak_internal(me);

  foreach b in array array['premier_pas', 'premiere_reponse', 'premier_rdv', 'serie_5', 'serie_20', 'domino', 'sans_pitch'] loop
    ok := case b
      when 'premier_pas' then exists (select 1 from public.linkedin_contact_events e where e.owner_id = me and e.action = 'Message envoyé')
      when 'premiere_reponse' then exists (select 1 from public.linkedin_contact_events e where e.owner_id = me and e.action = 'A répondu')
      when 'premier_rdv' then exists (select 1 from public.linkedin_contact_events e where e.owner_id = me and e.action = 'Statut : RDV fixé')
      when 'serie_5' then streak >= 5
      when 'serie_20' then streak >= 20
      when 'domino' then exists (select 1 from public.linkedin_contacts k where k.owner_id = me and k.grp = 'A' and k.status = 'Client / Partenaire')
      when 'sans_pitch' then (
        select count(*) >= 5
        from public.linkedin_contact_events e
        join public.linkedin_templates t on t.id = e.template_id
        where e.owner_id = me and e.action = 'A répondu' and t.step = '1'
      )
      else false
    end;
    if ok then
      insert into public.linkedin_badges (user_id, badge) values (me, b) on conflict do nothing;
      if found then
        earned := earned || b;
      end if;
    end if;
  end loop;
  return earned;
end;
$$;

-- ----------------------------------------------------------------------------
-- Données du mail du matin (appelée uniquement par le serveur, rôle service)
-- ----------------------------------------------------------------------------
create or replace function public.linkedin_ritual_digest(p_person uuid)
returns table (
  n_reponses integer,
  n_relances integer,
  n_prioritaires integer,
  streak integer,
  points_week integer,
  team_rdv integer,
  team_target integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  today date := public.linkedin_bxl_today();
  wk date := date_trunc('week', public.linkedin_bxl_today())::date;
  g public.linkedin_team_goal%rowtype;
  v_team_rdv integer := 0;
begin
  select * into g from public.linkedin_team_goal t order by (t.end_date >= today) desc, t.end_date desc limit 1;
  if g.id is not null then
    select count(distinct e.contact_id)::integer into v_team_rdv
    from public.linkedin_contact_events e
    join public.linkedin_challenge c on c.user_id = e.owner_id and c.active
    where e.action = 'Statut : RDV fixé'
      and (e.created_at at time zone 'Europe/Brussels')::date between g.start_date and g.end_date;
  end if;

  return query
  select
    (select count(*)::integer from public.linkedin_contacts k where k.owner_id = p_person and k.status = 'À toi de répondre'),
    (select count(*)::integer from public.linkedin_contacts k
      where k.owner_id = p_person and k.next_action is not null and k.next_action <= today
        and k.status not in ('Pas intéressé', 'Client / Partenaire', 'Équipe / réseau', 'Sollicitation reçue', 'Dernier message envoyé')),
    (select count(*)::integer from public.linkedin_contacts k where k.owner_id = p_person and k.priority = 1 and k.status = 'À contacter'),
    public.linkedin_streak_internal(p_person),
    public.linkedin_points_internal(p_person, wk, today),
    v_team_rdv,
    g.target;
end;
$$;

revoke all on function public.linkedin_ritual_digest(uuid) from public, anon, authenticated;
grant execute on function public.linkedin_ritual_digest(uuid) to service_role;

grant execute on function public.linkedin_challenge_summary(uuid) to authenticated;
grant execute on function public.linkedin_podium() to authenticated;
grant execute on function public.linkedin_team_overview() to authenticated;
grant execute on function public.linkedin_refresh_badges() to authenticated;
