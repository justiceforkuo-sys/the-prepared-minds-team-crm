-- ============================================================================
-- Bâtisseur — migration : ajoute le front Prescripteur au Sprint LinkedIn.
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

alter table public.linkedin_sprints
  add column if not exists cible_contacts_prescripteur integer not null default 50,
  add column if not exists cible_echanges_prescripteur integer not null default 15,
  add column if not exists cible_mises_en_relation_prescripteur integer not null default 5,
  add column if not exists cible_leads_prescripteur integer not null default 3;
