-- ============================================================================
-- Bâtisseur — migration 058 : frais professionnels déductibles et revenus mensuels (section « Finances »)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Strictement personnel, comme le reste de « Finances » : chaque personne ne voit que ses propres lignes
-- (aucun accès administrateur).
--   - finance_frais      : une ligne par dépense (date, compte, catégorie, fournisseur, montant) ;
--   - finance_frais_pct  : le % d'usage professionnel, stocké par catégorie ET par année, jamais par ligne.
--                          Le montant déductible est toujours recalculé (total × %), jamais saisi à la main ;
--   - finance_revenus    : les rentrées mensuelles attendues (cas prudent et cas complet) pour mesurer l'écart à couvrir.
-- Aucune donnée existante n'est touchée.

create table if not exists public.finance_frais (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  spent_on date not null,
  compte text not null default '',
  categorie text not null,
  fournisseur text not null default '',
  montant numeric(10,2) not null check (montant > 0),
  created_at timestamptz not null default now()
);
create index if not exists finance_frais_person_idx on public.finance_frais (person_id, spent_on desc);

create table if not exists public.finance_frais_pct (
  person_id uuid not null references public.people (id) on delete cascade,
  annee integer not null check (annee between 2000 and 2100),
  categorie text not null,
  pct numeric(5,4) not null default 0 check (pct >= 0 and pct <= 1),
  justification text,
  updated_at timestamptz not null default now(),
  primary key (person_id, annee, categorie)
);

create table if not exists public.finance_revenus (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  source text not null,
  montant_prudent numeric(10,2) check (montant_prudent is null or montant_prudent >= 0),
  montant_complet numeric(10,2) check (montant_complet is null or montant_complet >= 0),
  remarque text,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.finance_frais enable row level security;
alter table public.finance_frais_pct enable row level security;
alter table public.finance_revenus enable row level security;

drop policy if exists finance_frais_own on public.finance_frais;
create policy finance_frais_own on public.finance_frais for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

drop policy if exists finance_frais_pct_own on public.finance_frais_pct;
create policy finance_frais_pct_own on public.finance_frais_pct for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

drop policy if exists finance_revenus_own on public.finance_revenus;
create policy finance_revenus_own on public.finance_revenus for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

grant select, insert, update, delete on public.finance_frais, public.finance_frais_pct, public.finance_revenus to authenticated;
