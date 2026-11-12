-- ============================================================================
-- Bâtisseur — migration 065 : colonnes « feuille de recommandations » sur les prospects
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Chaque prospect (en particulier ceux des listes importées) peut porter les colonnes de la feuille de suivi :
-- recommandé par, relation avec la personne qui recommande, état civil, travail, région, remarque,
-- type d'action (DV, DR ou AR), commentaire après contact et date de contact. Aucune RLS à changer :
-- les écritures des listes passent déjà par le serveur après vérification du droit sur la liste.

alter table public.prospects
  add column if not exists recommended_by text,
  add column if not exists relation text,
  add column if not exists etat_civil text,
  add column if not exists travail text,
  add column if not exists region text,
  add column if not exists remarque text,
  add column if not exists type_action text,
  add column if not exists commentaire text,
  add column if not exists contact_date date;

alter table public.prospects drop constraint if exists prospects_type_action_check;
alter table public.prospects add constraint prospects_type_action_check
  check (type_action is null or type_action in ('DV', 'DR', 'AR'));
