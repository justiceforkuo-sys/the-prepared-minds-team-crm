-- ============================================================================
-- Bâtisseur — migration : parcours du nouveau collaborateur (remplace le Fast Start à 9 étapes)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Objectif : 1 000 unités en 60 jours max (passage FT2 / JFA II) + agrément FSMA.
-- Noms adaptés au schéma réel : « collaborateurs » = public.people ; les DV planifiés /
-- réalisés, les recommandations et les unités existent déjà (daily_activity, client_policies).
-- L'ancien Fast Start (public.onboarding_progress) est ARCHIVÉ : aucune ligne n'est supprimée.
-- Les écritures du parcours passent par des actions serveur (service role) : les tables
-- ci-dessous n'ont que des politiques de lecture.

-- 1. Fiche collaborateur ------------------------------------------------------
alter table public.people
  add column if not exists parcours_statut text not null default 'non_demarre'
    check (parcours_statut in ('non_demarre', 'actif', 'anterieur_termine')),
  add column if not exists integration_date date,
  add column if not exists statut_reglementaire text not null default 'en_formation'
    check (statut_reglementaire in ('en_formation', 'agree_fsma')),
  add column if not exists agrement_statut text not null default 'a_planifier'
    check (agrement_statut in ('a_planifier', 'depose', 'obtenu')),
  add column if not exists agrement_depose_at date,
  add column if not exists agrement_fsma_at date,
  add column if not exists ft2_at date,
  add column if not exists autonome_at date;

-- Garde-fou : un collaborateur ne peut pas modifier lui-même son statut réglementaire ni son parcours.
-- Le service role (actions serveur, auth.uid() nul) et l'admin passent.
create or replace function public.people_guard_parcours()
returns trigger
language plpgsql
as $$
begin
  if (new.parcours_statut is distinct from old.parcours_statut
      or new.integration_date is distinct from old.integration_date
      or new.statut_reglementaire is distinct from old.statut_reglementaire
      or new.agrement_statut is distinct from old.agrement_statut
      or new.agrement_depose_at is distinct from old.agrement_depose_at
      or new.agrement_fsma_at is distinct from old.agrement_fsma_at
      or new.ft2_at is distinct from old.ft2_at
      or new.autonome_at is distinct from old.autonome_at)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Ces champs ne sont modifiables que par un administrateur.';
  end if;
  return new;
end;
$$;

drop trigger if exists people_guard_parcours on public.people;
create trigger people_guard_parcours
  before update on public.people
  for each row execute function public.people_guard_parcours();

-- 2. Liste des 100 -------------------------------------------------------------
alter table public.prospects
  add column if not exists classement_liste text
    check (classement_liste in ('travailleur', 'non_travailleur', 'potentiel_recrutement'));

-- 3. Modèle du parcours (modifiable par l'admin) ----------------------------------
create table if not exists public.parcours_etapes (
  id uuid primary key default gen_random_uuid(),
  phase text not null check (phase in ('victoires', 'cap_ft2', 'autonomie', 'rythme', 'validation', 'regle')),
  ordre int not null default 0,
  jour_debut int,
  jour_fin int,
  titre text not null,
  avec_qui text,
  victoire text,
  etage_technique text,
  etage_savoir_etre text,
  auto_regle text,                       -- code évalué par l'application (voir src/lib/parcours.ts)
  necessite_agrement boolean not null default false,
  actif boolean not null default true
);

create table if not exists public.parcours_progression (
  user_id uuid not null references public.people (id) on delete cascade,
  etape_id uuid not null references public.parcours_etapes (id) on delete cascade,
  fait_at timestamptz,
  valide_at timestamptz,
  valide_par uuid references public.people (id) on delete set null,
  preuve text,
  primary key (user_id, etape_id)
);

create table if not exists public.modules_fsma (
  user_id uuid not null references public.people (id) on delete cascade,
  module text not null check (module in ('1.1', '1.2', '3.1', '3.2', '4')),
  statut text not null default 'a_faire' check (statut in ('a_faire', 'en_cours', 'reussi')),
  reussi_at date,
  note text,
  primary key (user_id, module)
);

-- Rythme fixe de chaque semaine (point individuel, victoire partagée) ; les chiffres du vendredi se déduisent de daily_activity
create table if not exists public.parcours_rythme (
  user_id uuid not null references public.people (id) on delete cascade,
  semaine int not null check (semaine between 1 and 52),
  point_individuel_at date,
  victoire_partagee_at date,
  primary key (user_id, semaine)
);

-- Banque d'histoires (savoir-être), gérée par l'admin
create table if not exists public.histoires (
  id uuid primary key default gen_random_uuid(),
  theme text not null,
  histoire text not null default '',
  question_groupe text,
  semaine_prevue int,
  racontee_le date,
  racontee_par text
);

alter table public.parcours_etapes enable row level security;
alter table public.parcours_progression enable row level security;
alter table public.modules_fsma enable row level security;
alter table public.parcours_rythme enable row level security;
alter table public.histoires enable row level security;

drop policy if exists "parcours_etapes_read" on public.parcours_etapes;
drop policy if exists "parcours_etapes_admin" on public.parcours_etapes;
create policy "parcours_etapes_read" on public.parcours_etapes for select using (auth.role() = 'authenticated');
create policy "parcours_etapes_admin" on public.parcours_etapes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "parcours_progression_read" on public.parcours_progression;
create policy "parcours_progression_read" on public.parcours_progression
  for select using (user_id = public.current_person_id() or public.is_admin() or public.is_downline_of(user_id, public.current_person_id()));

drop policy if exists "modules_fsma_read" on public.modules_fsma;
create policy "modules_fsma_read" on public.modules_fsma
  for select using (user_id = public.current_person_id() or public.is_admin() or public.is_downline_of(user_id, public.current_person_id()));

drop policy if exists "parcours_rythme_read" on public.parcours_rythme;
create policy "parcours_rythme_read" on public.parcours_rythme
  for select using (user_id = public.current_person_id() or public.is_admin() or public.is_downline_of(user_id, public.current_person_id()));

drop policy if exists "histoires_read" on public.histoires;
drop policy if exists "histoires_admin" on public.histoires;
create policy "histoires_read" on public.histoires for select using (auth.role() = 'authenticated');
create policy "histoires_admin" on public.histoires for all using (public.is_admin()) with check (public.is_admin());

grant select on public.parcours_progression, public.modules_fsma, public.parcours_rythme to authenticated;
grant select, insert, update, delete on public.parcours_etapes, public.histoires to authenticated;

-- 4. Chiffres de la cohorte -------------------------------------------------------
-- Une ligne par collaborateur en parcours actif dans la cascade de la personne connectée
-- (lui-même compris ; l'admin voit tout). Unités = contrats de ses clients depuis sa date d'intégration.
create or replace function public.parcours_cohort()
returns table (
  person_id uuid,
  name text,
  rank text,
  mentor_id uuid,
  mentor_name text,
  integration_date date,
  day_n integer,
  units numeric,
  units_7d numeric,
  dv_plan_total bigint,
  dv_real_total bigint,
  dv_plan_week bigint,
  dv_real_week bigint,
  dv_plan_j5_j7 bigint,
  recomm_total bigint,
  prospects_classes bigint,
  figures_days_week bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := public.current_person_id();
  today date := public.linkedin_bxl_today();
  wk date := date_trunc('week', public.linkedin_bxl_today())::date;
begin
  if me is null then
    raise exception 'not authorized';
  end if;
  return query
  with recursive tree as (
    select p.id from public.people p where p.id = me
    union all
    select c.id from public.people c join tree t on c.reports_to = t.id
  ),
  scope as (
    select p.id, p.name as pname, p.rank as prank, p.reports_to, p.integration_date as idate
    from public.people p
    where p.parcours_statut = 'actif' and p.integration_date is not null
      and (public.is_admin() or p.id in (select id from tree))
  )
  select
    s.id,
    s.pname,
    s.prank,
    s.reports_to,
    m.name,
    s.idate,
    (today - s.idate + 1)::integer,
    coalesce((select sum(cp.units) from public.clients cl join public.client_policies cp on cp.client_id = cl.id
              where cl.owner_id = s.id and cp.created_at::date >= s.idate), 0),
    coalesce((select sum(cp.units) from public.clients cl join public.client_policies cp on cp.client_id = cl.id
              where cl.owner_id = s.id and cp.created_at::date >= s.idate and cp.created_at::date > today - 7), 0),
    coalesce((select sum(da.dv_planifies) from public.daily_activity da where da.person_id = s.id and da.date >= s.idate), 0)::bigint,
    coalesce((select sum(da.dv_realises) from public.daily_activity da where da.person_id = s.id and da.date >= s.idate), 0)::bigint,
    coalesce((select sum(da.dv_planifies) from public.daily_activity da where da.person_id = s.id and da.date >= wk), 0)::bigint,
    coalesce((select sum(da.dv_realises) from public.daily_activity da where da.person_id = s.id and da.date >= wk), 0)::bigint,
    coalesce((select sum(da.dv_planifies) from public.daily_activity da
              where da.person_id = s.id and da.date between s.idate + 4 and s.idate + 6), 0)::bigint,
    coalesce((select sum(da.recomm_dv) from public.daily_activity da where da.person_id = s.id and da.date >= s.idate), 0)::bigint,
    (select count(*) from public.prospects pr where pr.owner_id = s.id and pr.classement_liste is not null)::bigint,
    (select count(*) from public.daily_activity da
      where da.person_id = s.id and da.date >= wk and da.date < wk + 5
        and (da.dv_planifies + da.dv_realises + da.recomm_dv + da.dr_planifies + da.dr_realises + da.dossiers) > 0)::bigint
  from scope s
  left join public.people m on m.id = s.reports_to
  order by s.idate, s.pname;
end;
$$;

grant execute on function public.parcours_cohort() to authenticated;

-- 5. Seed du parcours (modifiable ensuite par l'admin) ----------------------------
insert into public.parcours_etapes (phase, ordre, jour_debut, jour_fin, titre, avec_qui, victoire, etage_technique, etage_savoir_etre, auto_regle, necessite_agrement)
select * from (values
  -- Phase 1 : jours 1 à 14
  ('victoires', 10, 1, 1, 'Accueil et plan de départ', 'Justice / mentor', 'Son pourquoi tient en 3 lignes, planning des modules fixé',
   'Accueil, principe fondateur « je protège avant de vendre », son plan : 1 000 unités en 60 jours max + agrément FSMA, inscription aux modules', null, 'pourquoi', false),
  ('victoires', 20, 2, 2, 'Liste de 100 personnes de son entourage', 'Seul, puis relecture avec le mentor', 'Liste terminée',
   'Classer chaque personne : Travailleur / Non travailleur / Potentiel recrutement (dans Prospects)', null, 'prospects_100', false),
  ('victoires', 30, 3, 3, 'Observer un rendez-vous DV réel', 'Mentor', '5 observations notées',
   'Observe un rendez-vous DV réel du début à la fin', null, null, false),
  ('victoires', 40, 4, 4, 'Apprendre le script d''invitation DV et le message de recommandation', 'Mentor ou binôme', 'Récité sans notes',
   'Page Scripts', null, null, false),
  ('victoires', 50, 5, 7, 'Fixer ses premiers rendez-vous DV', 'Mentor à côté', 'Objectif 10 DV planifiés, validé à partir de 5',
   'Appelle / écrit à sa liste et fixe ses premiers rendez-vous DV', null, 'dv_plan_5', false),
  ('victoires', 60, 8, 9, 'Modules 1.1 et 1.2', 'Seul, point avec le mentor', 'Modules 1.1 et 1.2 réussis',
   'Étude des modules 1.1 et 1.2 (agrément FSMA)', null, 'modules_11_12', false),
  ('victoires', 70, 10, 10, 'Premier DV en duo', 'Mentor', 'DV tenu',
   'Il ouvre, le mentor conduit', null, 'dv_duo', false),
  ('victoires', 80, 11, 13, 'Continuer à appeler sa liste, DV en duo', 'Mentor', '3 à 5 DV réalisés cumulés, premières unités',
   'Continue d''appeler sa liste, DV en duo', null, 'dv_3_units', false),
  ('victoires', 90, 14, 14, 'Bilan des deux semaines et célébration devant la team', 'Toute la team', 'Victoire racontée au groupe (ses premières unités)',
   'Message prêt pour le groupe WhatsApp', null, null, false),
  -- Phase 2 : semaines 3 à 8
  ('cap_ft2', 10, 15, 28, 'Semaines 3-4 : DV avec le mentor, 5 recommandations par DV', 'Mentor', 'Au moins 500 unités',
   'Modules 3.1 et 3.2 (agrément FSMA)', 'Écouter sans proposer de produit', 'units_500', false),
  ('cap_ft2', 20, 29, 42, 'Semaines 5-6 : il conduit de plus en plus', 'Mentor', 'Modules 5/5 réussis, dossier d''agrément déposé',
   'Module 4 (agrément FSMA)', 'Dire non à une vente qui ne protège pas le client', 'modules_5_depot', false),
  ('cap_ft2', 30, 43, 56, 'Semaines 7-8 : ses DV, le mentor en observateur', 'Mentor (observateur)', '1 000 unités : passage FT2 / JFA II',
   'Agrément obtenu', 'Tenir sa parole sur les délais', 'units_1000', false),
  -- Phase 3 : après l'agrément
  ('autonomie', 10, 57, 70, 'Semaines 9-10 : mène seul ses DV1 et DV2', 'Autonome', 'Premier dossier mené seul jusqu''à l''encodage',
   'Mise en place et encodage des contrats', 'Boucler la boucle avec chaque recommandeur', null, true),
  ('autonomie', 20, 71, 84, 'Semaines 11-12 : autonome et son propre système', 'Autonome', 'Présente son système à la team',
   'Cadre réglementaire, obligations d''information et de conseil ; découverte du Pipeline LinkedIn et du Défi', 'Son propre système : principe, tiroirs, rituel', null, true),
  -- Rythme fixe
  ('rythme', 10, null, null, 'Point individuel de 20 minutes avec le mentor', 'Mentor', 'Unités de la semaine, DV planifiés, module en cours', null, null, null, false),
  ('rythme', 20, null, null, 'Chiffres du vendredi', 'Seul', 'DV planifiés / réalisés, recommandations, unités saisis avant vendredi 20h', null, null, 'chiffres_vendredi', false),
  ('rythme', 30, null, null, 'Une victoire partagée au groupe', 'Toute la team', 'Une victoire racontée', null, null, null, false),
  -- Validation finale (cochable uniquement par le mentor)
  ('validation', 10, null, null, 'Dit le principe fondateur avec ses propres mots', 'Mentor', null, null, null, null, false),
  ('validation', 20, null, null, 'A atteint 1 000 unités et est passé FT2 / JFA II', 'Auto', null, null, null, 'ft2', false),
  ('validation', 30, null, null, 'A obtenu son agrément FSMA', 'Auto', null, null, null, 'agrement', false),
  ('validation', 40, null, null, 'Mène seul un DV1 et un DV2 jusqu''à l''encodage', 'Mentor', null, null, null, null, true),
  ('validation', 50, null, null, 'Prend au moins 5 recommandations par DV et les contacte sous 24 à 48 h', 'Mentor (suggestion auto)', null, null, null, 'recos_5', false),
  ('validation', 60, null, null, 'Informe chaque recommandeur du résultat', 'Mentor', null, null, null, null, false),
  ('validation', 70, null, null, 'Tient son suivi à jour : aucune ligne sans date de relance, chiffres chaque vendredi sans rappel', 'Mentor (suggestion auto)', null, null, null, 'suivi_ok', false),
  ('validation', 80, null, null, 'A présenté son propre système à la team', 'Mentor', null, null, null, null, true),
  -- Règle continue
  ('regle', 10, 15, null, 'Chaque DV réalisé rapporte au moins 5 recommandations, toutes contactées en moins de 48 h', 'Mentor', 'Moyenne de 5 recommandations par DV', null, null, 'recos_5', false)
) as v(phase, ordre, jour_debut, jour_fin, titre, avec_qui, victoire, etage_technique, etage_savoir_etre, auto_regle, necessite_agrement)
where not exists (select 1 from public.parcours_etapes);

insert into public.histoires (theme, histoire, question_groupe, semaine_prevue)
select * from (values
  ('Protéger avant de vendre', '', 'Qu''aurais-tu fait à ma place ?', 1),
  ('L''urgence du client', '', 'Que se passe-t-il si on attend une semaine ?', 3),
  ('La reco honorée', '', 'Qui dois-tu rappeler aujourd''hui ?', 5),
  ('Le refus', '', 'Comment rester digne dans le non ?', 7),
  ('La parole tenue', '', 'Quelle promesse as-tu en cours ?', 9)
) as v(theme, histoire, question_groupe, semaine_prevue)
where not exists (select 1 from public.histoires);
