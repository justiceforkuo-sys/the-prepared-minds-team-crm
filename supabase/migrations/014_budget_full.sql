-- ============================================================================
-- Bâtisseur — migration : budget mensuel complet (perso/pro, annuel, imprévu)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotente : peut être lancée que la migration 013 ait déjà tourné ou non.
-- ============================================================================
-- Ajoute/ajuste :
--   1. budget_items.category : Fixe / Professionnelle / Extra / Annuelle /
--      Imprévue (remplace le jeu à 3 valeurs de la migration 013).
--   2. budget_items.month : mois ('YYYY-MM') auquel une dépense "Imprévue"
--      est rattachée — null pour les catégories récurrentes (toujours
--      comptées), rempli uniquement pour les imprévues (comptées une seule
--      fois, le mois où elles tombent, pas lissées).
-- ============================================================================

alter table public.budget_items
  add column if not exists category text not null default 'Fixe',
  add column if not exists is_annual boolean not null default false,
  add column if not exists month text;

alter table public.budget_items drop constraint if exists budget_items_category_check;
alter table public.budget_items
  add constraint budget_items_category_check
  check (category in ('Fixe', 'Professionnelle', 'Extra', 'Annuelle', 'Imprévue'));
