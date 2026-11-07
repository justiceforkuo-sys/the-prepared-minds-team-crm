-- ============================================================================
-- Bâtisseur — migration 055 : présence en ligne et temps passé sur le CRM
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Le navigateur envoie un signal toutes les 30 s tant que l'onglet est visible et utilisé (voir /api/presence).
-- Une ligne par personne et par jour (heure de Bruxelles) : secondes cumulées, nombre de connexions, dernier signal.
-- Le temps ajouté est le temps réellement écoulé depuis le signal précédent (jamais plus de 90 s) : un signal
-- envoyé en rafale ne gonfle donc rien. Les écritures passent par la fonction ci-dessous, réservée au serveur.

create table if not exists public.activity_daily (
  person_id uuid not null references public.people (id) on delete cascade,
  day date not null,
  seconds integer not null default 0,
  visits integer not null default 0,
  last_seen timestamptz not null default now(),
  primary key (person_id, day)
);
create index if not exists activity_daily_last_seen_idx on public.activity_daily (last_seen desc);

alter table public.activity_daily enable row level security;
drop policy if exists activity_daily_select on public.activity_daily;
create policy activity_daily_select on public.activity_daily for select to authenticated
  using (person_id = public.current_person_id() or public.is_admin());
grant select on public.activity_daily to authenticated;

create or replace function public.presence_ping(p_person uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Europe/Brussels')::date;
  v_prev timestamptz;
  v_gap numeric;
begin
  select max(last_seen) into v_prev from public.activity_daily where person_id = p_person;
  v_gap := case when v_prev is null then null else extract(epoch from (now() - v_prev)) end;

  insert into public.activity_daily (person_id, day, seconds, visits, last_seen)
  values (
    p_person, v_day,
    0,
    case when v_gap is null or v_gap > 300 then 1 else 0 end,
    now()
  )
  on conflict (person_id, day) do update
    set seconds = public.activity_daily.seconds + case when v_gap is not null and v_gap <= 90 then round(v_gap)::int else 0 end,
        visits = public.activity_daily.visits + case when v_gap is null or v_gap > 300 then 1 else 0 end,
        last_seen = now();
end;
$$;

revoke all on function public.presence_ping(uuid) from public, anon, authenticated;
grant execute on function public.presence_ping(uuid) to service_role;
