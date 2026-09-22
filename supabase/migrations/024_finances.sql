-- ============================================================================
-- Bâtisseur — migration : section "Finances" (outil financier personnel du
-- conseiller — cotisations, impôt, pension, budget, épargne).
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

create table public.financial_settings (
  person_id uuid primary key references public.people (id) on delete cascade,
  taux_cotisations_sociales numeric not null default 0.205,
  taux_imposition numeric not null default 0.32,
  taxe_communale numeric not null default 0.07,
  objectif_fonds_urgence_mois numeric not null default 6,
  fonds_urgence_actuel numeric not null default 0,
  rendement_epargne_pension numeric not null default 0.02,
  annees_avant_pension integer not null default 20,
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  categorie text not null,
  montant numeric not null,
  type text not null check (type in ('professionnelle', 'personnelle')),
  date date not null default current_date,
  recurrente boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.deductible_savings (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  type text not null check (type in ('epargne_pension', 'epargne_long_terme', 'plci_cpti', 'revenu_garanti', 'autre')),
  nom text,
  cotisation_mensuelle numeric not null,
  avantage_fiscal_taux numeric not null default 0.30,
  created_at timestamptz not null default now()
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  nom text not null,
  montant_cible numeric not null,
  montant_actuel numeric not null default 0,
  date_cible date,
  created_at timestamptz not null default now()
);

alter table public.financial_settings enable row level security;
alter table public.expenses enable row level security;
alter table public.deductible_savings enable row level security;
alter table public.savings_goals enable row level security;

create policy "financial_settings_own" on public.financial_settings for all
  using (person_id = current_person_id()) with check (person_id = current_person_id());
create policy "expenses_own" on public.expenses for all
  using (person_id = current_person_id()) with check (person_id = current_person_id());
create policy "deductible_savings_own" on public.deductible_savings for all
  using (person_id = current_person_id()) with check (person_id = current_person_id());
create policy "savings_goals_own" on public.savings_goals for all
  using (person_id = current_person_id()) with check (person_id = current_person_id());

grant select, insert, update, delete on public.financial_settings to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.deductible_savings to authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
