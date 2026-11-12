-- ============================================================================
-- Bâtisseur — migration 064 : tableau des recommandations (page Prospects)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Une ligne = une personne recommandée par un client ou un contact : nom, numéro, qui la recommande, relation avec
-- la personne qui recommande, état civil, travail, région, remarque, type d'action (DV, DR ou AR),
-- commentaire après le contact et date. Tableau personnel, comme le pipeline de prospects : seul son propriétaire le voit.

create table if not exists public.recommandations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people (id) on delete cascade,
  name text not null default '',
  phone text,
  recommended_by text,
  relation text,
  etat_civil text,
  travail text check (travail in ('oui', 'non')),
  region text,
  remarque text,
  type_action text check (type_action in ('DV', 'DR', 'AR')),
  commentaire text,
  contact_date date,
  created_at timestamptz not null default now()
);

create index if not exists recommandations_owner_idx on public.recommandations (owner_id, created_at);

alter table public.recommandations enable row level security;

drop policy if exists recommandations_select on public.recommandations;
create policy recommandations_select on public.recommandations for select to authenticated
  using (owner_id = public.current_person_id());

drop policy if exists recommandations_insert on public.recommandations;
create policy recommandations_insert on public.recommandations for insert to authenticated
  with check (owner_id = public.current_person_id());

drop policy if exists recommandations_update on public.recommandations;
create policy recommandations_update on public.recommandations for update to authenticated
  using (owner_id = public.current_person_id())
  with check (owner_id = public.current_person_id());

drop policy if exists recommandations_delete on public.recommandations;
create policy recommandations_delete on public.recommandations for delete to authenticated
  using (owner_id = public.current_person_id());

grant select, insert, update, delete on public.recommandations to authenticated;
