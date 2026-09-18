-- ============================================================================
-- Bâtisseur — migration : catégorie Prescripteur sur les Prospects
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Ajoute une 3e valeur de catégorie ('prescripteur'), son propre cycle de
-- statuts (distinct du cycle Contact→...→Perdu standard), et les champs
-- dédiés au suivi de mise en relation. Quand la mise en relation aboutit
-- (stage = 'Nouveau lead client généré'), l'app crée une vraie fiche
-- clients et la lie via redirected_client_id.
-- ============================================================================

-- category : élargit le CHECK existant pour autoriser 'prescripteur'
alter table public.prospects drop constraint if exists prospects_category_check;
alter table public.prospects add constraint prospects_category_check
  check (category in ('recrutement', 'client', 'prescripteur'));

-- stage : élargit le CHECK existant pour inclure le cycle dédié Prescripteur,
-- en plus du cycle standard déjà en place (aucune valeur existante retirée).
alter table public.prospects drop constraint if exists prospects_stage_check;
alter table public.prospects add constraint prospects_stage_check
  check (stage in (
    'Contact','Invité','Présentation faite','Suivi','Partenaire','Perdu',
    'Contacté','Répondu','Échange qualifié','Mise en relation obtenue',
    'Nouveau lead client généré','Sans suite'
  ));

-- Nouveaux champs, utilisés uniquement quand category = 'prescripteur'.
alter table public.prospects
  add column if not exists network_contact_name text,
  add column if not exists connection_status text
    check (connection_status in ('Oui', 'Non', 'En attente')),
  add column if not exists redirected_client_id uuid
    references public.clients (id) on delete set null;
