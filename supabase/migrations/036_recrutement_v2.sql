-- ============================================================================
-- Bâtisseur — migration : Recrutement v2 (suivi, étapes, formulaire de candidature)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- 1. Nouvelles colonnes (les anciennes candidatures gardent null sur les champs du nouveau formulaire).
--    La date de naissance reste dans la colonne existante `birthdate`.
-- 2. Étapes complètes : Nouveau → Contacté → Entretien planifié → Retenu → Intégré → Actif 90 j
--    + Rejeté / Sans suite (avec motif) + Non éligible (âge < 21 ans, éligibilité).
-- 3. Responsable (owner_id) et prochaine action ; ancienneté dans l'étape (stage_changed_at).
-- 4. Table de paramètres (créneaux de formation modifiables par l'admin).
-- 5. Le lien « Entretien de Recrutement » de chaque responsable vit dans people.calendly_links.entretien.

alter table public.recruitment_applications
  add column if not exists city text,
  add column if not exists eligibility text,
  add column if not exists eligible boolean,
  add column if not exists motivation text,
  add column if not exists hours_per_week text,
  add column if not exists sales_experience boolean,
  add column if not exists sales_experience_note text,
  add column if not exists income_goal text,
  add column if not exists dutch_level text,
  add column if not exists consent_at timestamptz,
  add column if not exists score integer,
  add column if not exists score_label text,
  add column if not exists owner_id uuid references public.people (id) on delete set null,
  add column if not exists next_action text,
  add column if not exists next_action_date date,
  add column if not exists stage_changed_at timestamptz not null default now(),
  add column if not exists interview_at timestamptz,
  add column if not exists status_reason text,
  add column if not exists person_id uuid references public.people (id) on delete set null,
  add column if not exists linkedin_contact_id uuid references public.linkedin_contacts (id) on delete set null;

-- Reprise de l'existant
update public.recruitment_applications set status = 'Entretien planifié' where status = 'Entretien';
update public.recruitment_applications set owner_id = recruiter_id where owner_id is null;
update public.recruitment_applications set stage_changed_at = created_at;

alter table public.recruitment_applications drop constraint if exists recruitment_applications_status_check;
alter table public.recruitment_applications
  add constraint recruitment_applications_status_check
  check (status in (
    'Nouveau', 'Contacté', 'Entretien planifié', 'Retenu', 'Intégré', 'Actif 90 j',
    'Rejeté', 'Sans suite', 'Non éligible'
  ));

create unique index if not exists recruitment_applications_linkedin_contact_uidx
  on public.recruitment_applications (linkedin_contact_id) where linkedin_contact_id is not null;
create index if not exists recruitment_applications_owner_idx
  on public.recruitment_applications (owner_id, status);

-- stage_changed_at suit le statut
create or replace function public.recruitment_touch_stage()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.stage_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists recruitment_touch_stage on public.recruitment_applications;
create trigger recruitment_touch_stage
  before update on public.recruitment_applications
  for each row execute function public.recruitment_touch_stage();

-- Droits : le recruteur d'origine, le responsable et l'admin. L'insertion par un
-- collaborateur sert au pipeline LinkedIn (groupe D) ; le formulaire public passe par le service role.
drop policy if exists "recruitment_select_own_or_admin" on public.recruitment_applications;
drop policy if exists "recruitment_update_own_or_admin" on public.recruitment_applications;
drop policy if exists "recruitment_insert_own_or_admin" on public.recruitment_applications;

create policy "recruitment_select_own_or_admin" on public.recruitment_applications
  for select using (
    recruiter_id = public.current_person_id() or owner_id = public.current_person_id() or public.is_admin()
  );

create policy "recruitment_update_own_or_admin" on public.recruitment_applications
  for update using (
    recruiter_id = public.current_person_id() or owner_id = public.current_person_id() or public.is_admin()
  );

create policy "recruitment_insert_own_or_admin" on public.recruitment_applications
  for insert with check (
    recruiter_id = public.current_person_id() or owner_id = public.current_person_id() or public.is_admin()
  );

grant select, insert, update, delete on public.recruitment_applications to authenticated;

-- Paramètres de l'application (clé / valeur)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read" on public.app_settings;
drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_read" on public.app_settings for select using (auth.role() = 'authenticated');
create policy "app_settings_admin_write" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.app_settings to authenticated;

insert into public.app_settings (key, value)
values ('recruitment_training_slots', '["Lundi 19h-21h", "Jeudi 19h-21h", "Samedi 11h-13h"]'::jsonb)
on conflict (key) do nothing;

-- Lien « Entretien de Recrutement » de Justice
update public.people
set calendly_links = coalesce(calendly_links, '{}'::jsonb)
  || jsonb_build_object('entretien', 'https://calendly.com/justiceforkuo-ovb/entretien-de-recrutement')
where email = 'justiceforkuo@preparedmindspro.com';
