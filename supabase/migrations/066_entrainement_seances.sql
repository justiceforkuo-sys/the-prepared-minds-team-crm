-- ============================================================================
-- Bâtisseur — migration 066 : séances d'entraînement aux appels enregistrées
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Chaque séance terminée (prospect fictif joué par Claude) est conservée avec la conversation entière
-- et le retour (note sur 10, étapes, point fort, point à améliorer). Elle est visible par la personne,
-- par sa hiérarchie (coach direct et au-dessus) et par les administrateurs. Les écritures passent par
-- le serveur (clé de service) : aucune politique d'insertion n'est nécessaire.

create table if not exists public.entrainement_seances (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  scenario_id text not null,
  scenario_titre text not null,
  niveau text,
  profil_label text,
  prenom text,
  note integer not null check (note between 0 and 10),
  rdv_obtenu boolean not null default false,
  echanges jsonb not null,
  retour jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists entrainement_seances_person_idx on public.entrainement_seances (person_id, created_at desc);

alter table public.entrainement_seances enable row level security;

drop policy if exists entrainement_seances_select on public.entrainement_seances;
create policy entrainement_seances_select on public.entrainement_seances for select to authenticated
  using (
    person_id = public.current_person_id()
    or public.is_downline_of(person_id, public.current_person_id())
    or public.is_admin()
  );

grant select on public.entrainement_seances to authenticated;
