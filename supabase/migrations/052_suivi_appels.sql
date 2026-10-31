-- ============================================================================
-- Bâtisseur — migration 052 : suivi des appels
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Chaque appel passé à un prospect est enregistré avec son résultat. Le nombre d'appels par personne
-- (aujourd'hui, semaine, mois) se suit dans la page « Appels ». Les écritures passent par le serveur.

create table if not exists public.call_log (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  prospect_id uuid references public.prospects (id) on delete set null,
  list_id uuid references public.prospect_lists (id) on delete set null,
  called_at timestamptz not null default now(),
  outcome text not null check (outcome in ('Répondu', 'Pas de réponse', 'Messagerie', 'À rappeler', 'Mauvais numéro', 'RDV pris', 'Pas intéressé')),
  note text
);
create index if not exists call_log_person_idx on public.call_log (person_id, called_at desc);
create index if not exists call_log_prospect_idx on public.call_log (prospect_id);

alter table public.call_log enable row level security;
drop policy if exists call_log_select on public.call_log;
create policy call_log_select on public.call_log for select to authenticated
  using (person_id = public.current_person_id() or public.is_admin());
grant select on public.call_log to authenticated;
