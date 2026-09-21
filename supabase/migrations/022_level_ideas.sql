-- ============================================================================
-- Bâtisseur — migration : idées adaptées du CRM "Level" (démo vidéo du 20/09)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

-- 1. Recommandé par (Client → Client)
alter table public.clients
  add column if not exists referred_by_client_id uuid
    references public.clients (id) on delete set null;

-- 2. Cartographie (géocodage mis en cache sur le client)
alter table public.clients
  add column if not exists lat numeric,
  add column if not exists lng numeric;

-- 4. Statut période d'essai
alter table public.people
  add column if not exists status text not null default 'actif'
    check (status in ('essai', 'actif'));
