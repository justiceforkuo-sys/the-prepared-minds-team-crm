-- ============================================================================
-- Bâtisseur — migration : suivi décompte verrouillé + budget personnel
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Ajoute :
--   1. client_policies.followup_date : date de suivi/décompte programmée avec
--      le client, obligatoire côté interface pour toute nouvelle police.
--   2. budget_items : dépenses fixes mensuelles personnelles, visibles par
--      la personne elle-même, son sponsor direct (lecture seule) et l'admin.
-- ============================================================================

alter table public.client_policies
  add column if not exists followup_date date;

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.budget_items enable row level security;

-- lecture : soi-même, son sponsor direct (reports_to), ou l'admin
create policy "budget_items_select" on public.budget_items
  for select using (
    person_id = current_person_id()
    or person_id in (select id from public.people where reports_to = current_person_id())
    or is_admin()
  );

-- écriture : uniquement soi-même
create policy "budget_items_insert" on public.budget_items
  for insert with check (person_id = current_person_id());

create policy "budget_items_update" on public.budget_items
  for update using (person_id = current_person_id());

create policy "budget_items_delete" on public.budget_items
  for delete using (person_id = current_person_id());

grant select, insert, update, delete on public.budget_items to authenticated;

-- Le sponsor direct doit aussi pouvoir lire le payout réel de ses recrues,
-- pour comparer avec leur budget (dépenses fixes). Politique de lecture
-- additionnelle, en plus de "payout_own_or_admin" déjà en place — ne touche
-- pas aux droits d'écriture (toujours réservés à la personne elle-même/admin).
create policy "payout_sponsor_read" on public.payout_history
  for select using (
    person_id in (select id from public.people where reports_to = current_person_id())
  );
