-- ============================================================================
-- Bâtisseur — migration 043 : LinkedIn → CRM (nouvelles relations par email + objectif hebdomadaire)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Aucune extension, aucun scraping : le collaborateur transfère lui-même les emails
-- « invitation acceptée » de LinkedIn vers une adresse de réception personnelle du CRM.
--   people.linkedin_inbox_code       : code aléatoire dans l'adresse de réception (non devinable)
--   people.linkedin_weekly_goal      : objectif « nouvelles relations cette semaine »
--   people.linkedin_last_import_at   : dernier import de Connections.csv (rappel mensuel)
--   linkedin_inbound_log             : journal des emails reçus et de leur résultat ;
--                                      le contenu brut est supprimé après 30 jours
-- ============================================================================

alter table public.people
  add column if not exists linkedin_inbox_code text,
  add column if not exists linkedin_weekly_goal integer not null default 10 check (linkedin_weekly_goal between 0 and 500),
  add column if not exists linkedin_last_import_at timestamptz;

update public.people
set linkedin_inbox_code = substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 8)
where linkedin_inbox_code is null;

alter table public.people
  alter column linkedin_inbox_code set default substr(md5(random()::text || clock_timestamp()::text), 1, 8);

create unique index if not exists people_linkedin_inbox_code_uidx on public.people (linkedin_inbox_code);

create table if not exists public.linkedin_inbound_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.people (id) on delete cascade,
  received_at timestamptz not null default now(),
  from_addr text,
  subject text,
  result text not null check (result in ('cree', 'doublon', 'ignore', 'confirmation', 'erreur')),
  contact_id uuid references public.linkedin_contacts (id) on delete set null,
  detail text,
  raw_body text
);

create index if not exists linkedin_inbound_log_owner_idx on public.linkedin_inbound_log (owner_id, received_at desc);
create index if not exists linkedin_inbound_log_received_idx on public.linkedin_inbound_log (received_at desc);

alter table public.linkedin_inbound_log enable row level security;

drop policy if exists linkedin_inbound_log_read on public.linkedin_inbound_log;
create policy linkedin_inbound_log_read on public.linkedin_inbound_log
  for select to authenticated
  using (owner_id = public.current_person_id() or public.is_admin());

grant select on public.linkedin_inbound_log to authenticated;

-- Suppression du contenu brut des emails après 30 jours (le journal lui-même est conservé)
create or replace function public.purge_linkedin_inbound_raw()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.linkedin_inbound_log
  set raw_body = null
  where raw_body is not null and received_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.purge_linkedin_inbound_raw() from public, anon, authenticated;
grant execute on function public.purge_linkedin_inbound_raw() to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'linkedin-inbound-purge';
select cron.schedule('linkedin-inbound-purge', '20 3 * * *', $cron$select public.purge_linkedin_inbound_raw()$cron$);
