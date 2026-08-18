-- ============================================================================
-- The Prepared Minds Team CRM — migration : module Recrutement
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Candidatures reçues via les formulaires Jotform de pré-qualification (un
-- formulaire par collaborateur, cf. campagne d'affiches "Directeur d'agence").
-- Insérées uniquement par la route webhook (clé service role, contourne la RLS) ;
-- lues/mises à jour par le recruteur concerné ou l'admin.
-- ============================================================================

create table public.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references public.people (id) on delete set null,
  name text not null,
  phone text,
  email text,
  nationality text,
  current_situation text,
  birthdate date,
  has_cess boolean,
  availability_confirmed boolean,
  french_level text,
  english_level text,
  referral_source text,
  status text not null default 'Nouveau'
    check (status in ('Nouveau', 'Contacté', 'Entretien', 'Retenu', 'Rejeté')),
  jotform_submission_id text unique,
  created_at timestamptz not null default now()
);

alter table public.recruitment_applications enable row level security;

-- Le recruteur voit ses propres candidatures ; l'admin voit tout.
create policy "recruitment_select_own_or_admin" on public.recruitment_applications
  for select using (recruiter_id = public.current_person_id() or public.is_admin());

-- Changement de statut (Nouveau -> Contacté -> Entretien -> Retenu/Rejeté).
create policy "recruitment_update_own_or_admin" on public.recruitment_applications
  for update using (recruiter_id = public.current_person_id() or public.is_admin());

create policy "recruitment_delete_admin" on public.recruitment_applications
  for delete using (public.is_admin());

-- Pas de policy d'insertion pour authenticated/anon : les candidatures arrivent
-- uniquement via la route webhook (clé service role, contourne la RLS).

grant select, update, delete on public.recruitment_applications to authenticated;
