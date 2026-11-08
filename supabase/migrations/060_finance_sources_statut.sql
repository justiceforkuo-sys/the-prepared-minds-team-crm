-- ============================================================================
-- Bâtisseur — migration 060 : sources de revenu libres, statut professionnel et fiches de paie lues (section « Finances »)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Chacun compose ses propres colonnes de revenus (salaire d'un employeur, job étudiant, commissions, loyers…) au lieu
-- des trois colonnes G4S / OVB prévues au départ. Tout reste strictement personnel (aucun accès administrateur).
--   - finance_revenus_sources : les colonnes de revenus choisies par chaque personne ;
--   - finance_revenus_recus   : la liste fermée des sources est levée ; « fiche » garde les montants lus sur une fiche de paie
--                               (brut, cotisations, précompte, net). Le fichier lui-même n'est jamais conservé ;
--   - financial_settings      : le statut professionnel choisi par la personne.
-- Les données déjà saisies restent intactes.

alter table public.finance_revenus_recus drop constraint if exists finance_revenus_recus_source_check;
alter table public.finance_revenus_recus add column if not exists fiche jsonb;

create table if not exists public.finance_revenus_sources (
  person_id uuid not null references public.people (id) on delete cascade,
  nom text not null check (length(btrim(nom)) > 0),
  ordre integer not null default 0,
  primary key (person_id, nom)
);

alter table public.finance_revenus_sources enable row level security;
drop policy if exists finance_revenus_sources_own on public.finance_revenus_sources;
create policy finance_revenus_sources_own on public.finance_revenus_sources for all to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());
grant select, insert, update, delete on public.finance_revenus_sources to authenticated;

-- Les colonnes déjà utilisées (G4S avance, G4S solde, OVB Willemot) deviennent des sources comme les autres
insert into public.finance_revenus_sources (person_id, nom, ordre)
select s.person_id, s.source, case s.source when 'G4S avance' then 0 when 'G4S solde' then 1 else 2 end
from (select distinct person_id, source from public.finance_revenus_recus) s
on conflict (person_id, nom) do nothing;

alter table public.financial_settings add column if not exists statut_pro text
  check (statut_pro is null or statut_pro in ('principal', 'complementaire', 'etudiant'));
