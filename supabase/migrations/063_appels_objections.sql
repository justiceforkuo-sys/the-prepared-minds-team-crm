-- ============================================================================
-- Bâtisseur — migration 063 : bloc 10, les appels téléphoniques (entonnoir et objections)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Le suivi des appels existe déjà (call_log, migration 052) : un appel « joint » et un appel « RDV fixé » se déduisent de
-- son résultat (outcome), aucune colonne en plus. On ajoute seulement l'objection entendue après un appel joint sans RDV :
--   - objection_id   : l'objection choisie dans la banque de l'équipe (table objections, migration 062) ;
--   - objection_mots : si « Autre », les mots exacts de la personne (sans nom), que l'administrateur transforme en objection.
-- Les seuils de lecture de l'entonnoir sont réglables par les administrateurs (app_settings, clé « appels_seuils »).

alter table public.call_log add column if not exists objection_id uuid references public.objections (id) on delete set null;
alter table public.call_log add column if not exists objection_mots text;
create index if not exists call_log_objection_idx on public.call_log (objection_id) where objection_id is not null;

-- Valeurs de départ, à ajuster dans Admin : volume minimal par semaine, taux minimal de RDV parmi les appels joints,
-- nombre d'appels sur 4 semaines en dessous duquel on ne juge pas encore.
insert into public.app_settings (key, value)
values ('appels_seuils', '{"volume_semaine": 50, "taux_rdv_joints": 0.2, "min_appels": 30}'::jsonb)
on conflict (key) do nothing;
