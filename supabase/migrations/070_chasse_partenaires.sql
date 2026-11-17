-- ============================================================================
-- Bâtisseur — migration 070 : chasse aux partenaires (comptables, maisons de repos, tarification, notaires…)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Une ligne = une structure ou un professionnel que la personne veut transformer en partenaire. Chaque personne tient sa
-- propre liste ; elle est visible par sa hiérarchie (coach direct et au-dessus) et par les administrateurs. Les écritures
-- passent par le serveur (clé de service) : aucune politique d'écriture n'est nécessaire.
--
--   type                  : comptable, maison_repos, tarification (tarification et soins), courtier_credit, agent_immo,
--                           notaire, kine, federation, secretariat_social, autre
--   statut                : a_appeler → appele → rdv_fixe → rencontre → partenaire (ou sans_suite = pas intéressé / ecarte)
--   priorite              : 1 à 3 (P1 = à appeler en premier)
--   confirmation_envoyee  : le mail de confirmation du rendez-vous (à envoyer dans l'heure) est parti
--   relance_le            : date à laquelle relancer (pas de réponse : J+5)
--   contact_*             : coordonnées PROFESSIONNELLES uniquement (jamais d'infirmier ni de client)
--
-- La liste de Justice (224 contacts du tableur « Chasse partenaires — Liège et environs ») est importée ensuite par un script.

create table if not exists public.partenaires_chasse (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people (id) on delete cascade,
  nom text not null check (length(btrim(nom)) > 0),
  type text not null default 'autre' check (type in ('comptable', 'maison_repos', 'tarification', 'courtier_credit', 'agent_immo', 'notaire', 'kine', 'federation', 'secretariat_social', 'autre')),
  zone text,
  adresse text,
  statut text not null default 'a_appeler' check (statut in ('a_appeler', 'appele', 'rdv_fixe', 'rencontre', 'partenaire', 'sans_suite', 'ecarte')),
  priorite smallint check (priorite between 1 and 3),
  remarque text,
  contact_nom text,
  contact_tel text,
  tel_a_verifier boolean not null default false,
  contact_email text,
  contact_web text,
  rdv_at timestamptz,
  rdv_format text check (rdv_format in ('visio', 'bureau')),
  rdv_lieu text,
  confirmation_envoyee boolean not null default false,
  dernier_appel date,
  nb_appels integer not null default 0 check (nb_appels >= 0),
  prochaine_etape text,
  relance_le date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, type, nom)
);

create index if not exists partenaires_chasse_owner_idx on public.partenaires_chasse (owner_id, type, statut);

alter table public.partenaires_chasse enable row level security;

drop policy if exists partenaires_chasse_select on public.partenaires_chasse;
create policy partenaires_chasse_select on public.partenaires_chasse for select to authenticated
  using (
    owner_id = public.current_person_id()
    or public.is_downline_of(owner_id, public.current_person_id())
    or public.is_admin()
  );

grant select on public.partenaires_chasse to authenticated;
