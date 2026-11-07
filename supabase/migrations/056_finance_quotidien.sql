-- ============================================================================
-- Bâtisseur — migration 056 : suivi des dépenses du quotidien (section « Finances »)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Strictement personnel, comme le reste de « Finances » : chaque personne ne voit que ses propres dépenses
-- (aucun accès administrateur). Ces dépenses du jour le jour sont séparées des « charges » de l'estimation fiscale :
-- elles servent à voir ce qui part chaque jour, et à corriger tôt les écarts avant qu'ils ne s'accumulent.

create table if not exists public.finance_daily (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  spent_on date not null default current_date,
  montant numeric(10,2) not null check (montant > 0),
  categorie text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists finance_daily_person_day_idx on public.finance_daily (person_id, spent_on desc);

-- Budget par jour choisi par la personne (facultatif)
create table if not exists public.finance_daily_settings (
  person_id uuid primary key references public.people (id) on delete cascade,
  budget_jour numeric(10,2) check (budget_jour is null or budget_jour >= 0),
  updated_at timestamptz not null default now()
);

alter table public.finance_daily enable row level security;
alter table public.finance_daily_settings enable row level security;

drop policy if exists finance_daily_own on public.finance_daily;
create policy finance_daily_own on public.finance_daily for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

drop policy if exists finance_daily_settings_own on public.finance_daily_settings;
create policy finance_daily_settings_own on public.finance_daily_settings for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

grant select, insert, update, delete on public.finance_daily, public.finance_daily_settings to authenticated;
