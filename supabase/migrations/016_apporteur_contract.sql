-- ============================================================================
-- Bâtisseur — migration : type de contrat (Apporteur / Intermédiaire)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Distingue les personnes sous contrat d'apporteur (rémunérées au forfait
-- par client, pas au système d'unités) de celles sous le système actuel
-- (intermédiaire, unités/rang). Défaut 'intermediaire' pour ne rien changer
-- au comportement de personne tant qu'un admin n'a pas explicitement
-- basculé quelqu'un.
-- ============================================================================

alter table public.people
  add column if not exists contract_type text not null default 'intermediaire'
    check (contract_type in ('apporteur', 'intermediaire'));
