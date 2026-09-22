-- ============================================================================
-- Bâtisseur — migration : cycle de statuts LinkedIn (Client/Recrutement) +
-- suivi de sprint (Playbook LinkedIn – Recrutement & Acquisition PMT).
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

-- 1. Élargit le CHECK pour les 2 nouvelles valeurs du cycle LinkedIn
--    ("Contacté"/"Répondu"/"Perdu" existent déjà via le cycle Prescripteur).
alter table public.prospects drop constraint if exists prospects_stage_check;
alter table public.prospects add constraint prospects_stage_check
  check (stage in (
    'Contact','Invité','Présentation faite','Suivi','Partenaire','Perdu',
    'Contacté','Répondu','Échange qualifié','Mise en relation obtenue',
    'Nouveau lead client généré','Sans suite',
    'RDV pris','Entretien / Dossier'
  ));

-- 2. Remappe les prospects Client/Recrutement existants vers le nouveau
--    cycle (le Prescripteur n'est pas touché, ses stages ne collisionnent
--    pas avec ceux remappés ici).
update public.prospects set stage = 'Contacté'
  where category in ('client', 'recrutement') and stage = 'Contact';
update public.prospects set stage = 'RDV pris'
  where category in ('client', 'recrutement') and stage = 'Invité';
update public.prospects set stage = 'Entretien / Dossier'
  where category in ('client', 'recrutement') and stage in ('Présentation faite', 'Suivi', 'Partenaire');
-- 'Perdu' reste inchangé.

-- Le défaut de la colonne était 'Contact' (ancien cycle) — les nouveaux
-- prospects Client/Recrutement créés sans stage explicite se retrouvaient
-- sinon hors du nouveau cycle affiché dans l'UI.
alter table public.prospects alter column stage set default 'Contacté';

-- 3. Sprint LinkedIn (cibles chiffrées par front) + bilan hebdomadaire
--    (métriques LinkedIn natives sans équivalent dans le CRM).
create table public.linkedin_sprints (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  titre text not null default 'Sprint LinkedIn',
  date_debut date not null,
  date_fin date not null,
  cible_contacts_recrutement integer not null default 150,
  cible_echanges_recrutement integer not null default 30,
  cible_entretiens_recrutement integer not null default 9,
  cible_jfa_recrutement integer not null default 4,
  cible_contacts_client integer not null default 150,
  cible_echanges_client integer not null default 40,
  cible_rdv_client integer not null default 15,
  cible_dossiers_client integer not null default 7,
  created_at timestamptz not null default now()
);

create table public.linkedin_weekly_log (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  semaine_debut date not null,
  connexions_envoyees integer not null default 0,
  connexions_acceptees integer not null default 0,
  posts_publies integer not null default 0,
  commentaires_postes integer not null default 0,
  created_at timestamptz not null default now(),
  unique (person_id, semaine_debut)
);

alter table public.linkedin_sprints enable row level security;
alter table public.linkedin_weekly_log enable row level security;

create policy "linkedin_sprints_own" on public.linkedin_sprints for all
  using (person_id = current_person_id()) with check (person_id = current_person_id());
create policy "linkedin_weekly_log_own" on public.linkedin_weekly_log for all
  using (person_id = current_person_id()) with check (person_id = current_person_id());

grant select, insert, update, delete on public.linkedin_sprints to authenticated;
grant select, insert, update, delete on public.linkedin_weekly_log to authenticated;
