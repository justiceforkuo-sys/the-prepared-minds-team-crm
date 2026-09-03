-- ============================================================================
-- Bâtisseur — migration : catégories de budget + lissage des dépenses annuelles
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Ajoute :
--   1. budget_items.category : Fixe / Extra / Annuelle / imprévue.
--   2. budget_items.is_annual : si vrai, "amount" représente le montant
--      ANNUEL — la part mensuelle à provisionner (amount/12) est calculée
--      côté application, pas stockée.
-- ============================================================================

alter table public.budget_items
  add column if not exists category text not null default 'Fixe'
    check (category in ('Fixe', 'Extra', 'Annuelle / imprévue')),
  add column if not exists is_annual boolean not null default false;
