-- ============================================================================
-- Bâtisseur — migration : Pipeline LinkedIn (Phase A)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- linkedin_contacts       : les relations LinkedIn importées par chaque collaborateur
-- linkedin_contact_events : historique (message envoyé, a répondu, changement de statut)
-- people.calendly_url     : lien Calendly du collaborateur, injecté dans les messages
--
-- Droits : écriture = le propriétaire uniquement ; lecture = le propriétaire,
-- toute sa hiérarchie ascendante (sponsors) et l'admin.
-- ============================================================================

alter table public.people
  add column if not exists calendly_url text;

create table if not exists public.linkedin_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people (id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  linkedin_url text not null,
  company text,
  position text,
  connected_on date,
  grp text not null check (grp in ('A', 'B', 'C', 'D', 'E', 'F')),
  priority smallint not null default 3 check (priority between 1 and 3),
  status text not null default 'À contacter' check (status in (
    'À contacter', 'Contacté', 'Relance envoyée', 'Dernier message envoyé',
    'À toi de répondre', 'En conversation', 'RDV fixé', 'Client / Partenaire',
    'Plus tard', 'Pas intéressé', 'Sollicitation reçue', 'Équipe / réseau'
  )),
  last_contact date,
  next_action date,
  msgs_sent integer not null default 0,
  msgs_received integer not null default 0,
  note text not null default '',
  tags text[] not null default '{}',
  prospect_id uuid references public.prospects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, linkedin_url)
);

create index if not exists linkedin_contacts_owner_status_idx on public.linkedin_contacts (owner_id, status);
create index if not exists linkedin_contacts_owner_next_idx on public.linkedin_contacts (owner_id, next_action);

drop trigger if exists linkedin_contacts_touch_updated_at on public.linkedin_contacts;
create trigger linkedin_contacts_touch_updated_at
  before update on public.linkedin_contacts
  for each row execute function public.touch_updated_at();

create table if not exists public.linkedin_contact_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.linkedin_contacts (id) on delete cascade,
  owner_id uuid not null references public.people (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists linkedin_events_owner_created_idx on public.linkedin_contact_events (owner_id, created_at desc);
create index if not exists linkedin_events_contact_idx on public.linkedin_contact_events (contact_id, created_at desc);

alter table public.linkedin_contacts enable row level security;
alter table public.linkedin_contact_events enable row level security;

-- Écriture : le propriétaire (et ses propres lignes seulement)
create policy "linkedin_contacts_own_write" on public.linkedin_contacts
  for all using (owner_id = current_person_id())
  with check (owner_id = current_person_id());

-- Lecture : sa cascade et l'admin (is_downline_of inclut la personne elle-même)
create policy "linkedin_contacts_cascade_read" on public.linkedin_contacts
  for select using (
    owner_id = current_person_id()
    or is_admin()
    or is_downline_of(owner_id, current_person_id())
  );

create policy "linkedin_events_own_write" on public.linkedin_contact_events
  for all using (owner_id = current_person_id())
  with check (owner_id = current_person_id());

create policy "linkedin_events_cascade_read" on public.linkedin_contact_events
  for select using (
    owner_id = current_person_id()
    or is_admin()
    or is_downline_of(owner_id, current_person_id())
  );

grant select, insert, update, delete on public.linkedin_contacts to authenticated;
grant select, insert, update, delete on public.linkedin_contact_events to authenticated;
