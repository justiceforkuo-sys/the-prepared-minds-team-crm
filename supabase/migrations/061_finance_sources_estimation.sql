-- ============================================================================
-- Bâtisseur — migration 061 : quelles colonnes de revenus comptent dans l'estimation (section « Finances »)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Sans décomptes OVB dans le CRM, l'estimation (cotisations, impôt, net disponible) part des « revenus reçus » :
-- seules les colonnes cochées « compte dans l'estimation » y entrent (les commissions, pas un salaire d'employeur).
-- Les colonnes déjà nommées OVB ou commissions sont cochées d'office ; chacun peut cocher ou décocher les siennes.

alter table public.finance_revenus_sources add column if not exists independant boolean not null default false;

update public.finance_revenus_sources set independant = true where nom ilike '%ovb%' or nom ilike '%commission%';
