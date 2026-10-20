-- ============================================================================
-- Bâtisseur — migration 042 : la rémunération des nouveaux ne concerne que FT1 à FT3
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Précision de Justice (20 oct. 2026) : ce type de paiement (forfait par client, réserve et
-- rattrapage) n'affecte pas le rang FA et au-dessus. Il ne concerne que FT1, FT2 et FT3
-- (JFA I, II, III). À partir de FA, le système habituel s'applique.
--   - la table des valeurs de point ne garde que JFAI, JFAII, JFAIII ;
--   - remu_concerned() exige un rang FT1 à FT3 : un contrat souscrit par un FA ou plus
--     n'enregistre ni rang ni valeur de point dans ce système.
-- Les données déjà calculées ne sont pas supprimées.
-- ============================================================================

delete from public.valeur_point_rang where rang not in ('JFAI', 'JFAII', 'JFAIII');

create or replace function public.remu_concerned(p_person uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select date_demarrage >= date '2026-01-01' and rank in ('JFAI', 'JFAII', 'JFAIII')
       from public.people where id = p_person),
    false)
$$;
