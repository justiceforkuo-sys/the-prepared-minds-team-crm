-- ============================================================================
-- Bâtisseur — migration 054 : suivi des dettes personnelles (section « Finances »)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Strictement personnel, comme le reste de « Finances » : chaque personne ne voit que ses propres dettes
-- (aucun accès administrateur). Le reste à payer = total − déjà payé avant le suivi − paiements enregistrés.

create table if not exists public.finance_debts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  nom text not null,
  creancier text,
  total numeric(12,2) not null check (total >= 0),
  deja_paye numeric(12,2) not null default 0 check (deja_paye >= 0),
  paiement_mensuel numeric(10,2),
  echeance date,
  statut text not null default 'En cours',
  note text,
  inclus_budget boolean not null default false,
  priorite integer not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.finance_debts (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  paid_on date not null default current_date,
  montant numeric(10,2) not null check (montant > 0),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists finance_debt_payments_debt_idx on public.finance_debt_payments (debt_id, paid_on desc);

alter table public.finance_debts enable row level security;
alter table public.finance_debt_payments enable row level security;

drop policy if exists finance_debts_own on public.finance_debts;
create policy finance_debts_own on public.finance_debts for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

drop policy if exists finance_debt_payments_own on public.finance_debt_payments;
create policy finance_debt_payments_own on public.finance_debt_payments for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

grant select, insert, update, delete on public.finance_debts, public.finance_debt_payments to authenticated;
