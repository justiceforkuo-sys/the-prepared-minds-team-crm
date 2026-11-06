-- ============================================================================
-- Bâtisseur — migration 053 : comptes rendus de rendez-vous
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Après un rendez-vous (bilan financier, entretien de recrutement, coaching), on note le résultat, une remarque
-- (écrite ou dictée) et la prochaine étape. L'historique est conservé : un contact peut avoir plusieurs comptes rendus.
-- Visible par les administrateurs, par l'auteur et par le collaborateur responsable du contact.
-- Les écritures et les lectures de l'historique passent par le serveur, qui vérifie ces droits.

create table if not exists public.rdv_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.people (id) on delete cascade,
  prospect_id uuid references public.prospects (id) on delete cascade,
  application_id uuid references public.recruitment_applications (id) on delete cascade,
  happened_on date not null default current_date,
  outcome text not null,
  note text,
  via_voice boolean not null default false,
  next_follow_up date,
  created_at timestamptz not null default now(),
  check ((prospect_id is not null) <> (application_id is not null))
);
create index if not exists rdv_reports_prospect_idx on public.rdv_reports (prospect_id, happened_on desc);
create index if not exists rdv_reports_application_idx on public.rdv_reports (application_id, happened_on desc);
create index if not exists rdv_reports_author_idx on public.rdv_reports (author_id, happened_on desc);

alter table public.rdv_reports enable row level security;
drop policy if exists rdv_reports_select on public.rdv_reports;
create policy rdv_reports_select on public.rdv_reports for select to authenticated
  using (author_id = public.current_person_id() or public.is_admin());
grant select on public.rdv_reports to authenticated;
