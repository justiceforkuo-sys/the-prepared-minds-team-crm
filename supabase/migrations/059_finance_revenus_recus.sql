-- ============================================================================
-- Bâtisseur — migration 059 : revenus reçus mois par mois (section « Finances »)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Historique des virements NETS reçus sur les comptes (salaire G4S : avance et solde ; commissions OVB), mois par mois.
-- Strictement personnel, comme le reste de « Finances » : chaque personne ne voit que ses propres lignes.
-- Un montant vide (null) = extrait de compte manquant : on le voit, on ne le confond pas avec 0 €.
-- Ces montants nets ne servent pas à la déclaration fiscale (fiche 281.10 de l'employeur, fiche fiscale de la société).

create table if not exists public.finance_revenus_recus (
  person_id uuid not null references public.people (id) on delete cascade,
  mois text not null check (mois ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  source text not null check (source in ('G4S avance', 'G4S solde', 'OVB Willemot')),
  montant numeric(10,2) check (montant is null or montant >= 0),
  note text,
  updated_at timestamptz not null default now(),
  primary key (person_id, mois, source)
);

alter table public.finance_revenus_recus enable row level security;

drop policy if exists finance_revenus_recus_own on public.finance_revenus_recus;
create policy finance_revenus_recus_own on public.finance_revenus_recus for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());

grant select, insert, update, delete on public.finance_revenus_recus to authenticated;
