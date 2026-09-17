-- ============================================================================
-- Bâtisseur — migration : étiquette recrutement / client sur les prospects
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- category : distingue une prospection recrutement d'une prospection client
-- (utile notamment pour trier la prospection LinkedIn). Par défaut 'client'
-- pour ne pas casser les prospects existants.
-- ============================================================================

alter table public.prospects
  add column if not exists category text not null default 'client'
    check (category in ('recrutement', 'client'));
