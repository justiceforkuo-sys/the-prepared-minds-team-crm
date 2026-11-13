-- ============================================================================
-- Bâtisseur — migration 067 : rapports du vendredi
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Chaque vendredi, le CRM prépare pour chaque collaborateur suivi un rapport : le bilan des tâches données la semaine
-- précédente, où il en est, et les tâches de la semaine suivante. Le ton monte (niveaux 1 à 4) quand les tâches ne sont
-- pas faites. Niveaux 1 et 2 : publiés tout de suite. Niveaux 3 et 4 : « à valider » par un administrateur ou le coach.
-- Les écritures passent par le serveur ; la personne ne voit que ses rapports publiés.
--
--   people.rapport_hebdo : la personne reçoit-elle un rapport du vendredi ? (par défaut : collaborateurs JFAI et JFAII)
--   rapports_hebdo       : un rapport par personne et par vendredi.

alter table public.people add column if not exists rapport_hebdo boolean not null default false;
update public.people set rapport_hebdo = true where active and rank in ('JFAI', 'JFAII') and rapport_hebdo = false;

create table if not exists public.rapports_hebdo (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  semaine date not null,                       -- le vendredi du rapport (date de Bruxelles)
  niveau integer not null check (niveau between 1 and 4),
  serie integer not null default 0,            -- semaines de suite avec moins de 50 % des tâches faites
  taux numeric,                                -- part des tâches de la semaine précédente faites (null au premier rapport)
  bilan jsonb not null default '[]'::jsonb,    -- tâches de la semaine précédente avec le réalisé
  taches jsonb not null default '[]'::jsonb,   -- tâches de la semaine suivante
  faits jsonb not null default '{}'::jsonb,    -- chiffres de la semaine et situation
  redaction jsonb not null default '{}'::jsonb, -- ouverture et clôture rédigées
  sujet text not null,
  statut text not null check (statut in ('a_valider', 'envoye', 'ignore')),
  envoye_at timestamptz,
  envoye_par uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (person_id, semaine)
);

create index if not exists rapports_hebdo_person_idx on public.rapports_hebdo (person_id, semaine desc);

alter table public.rapports_hebdo enable row level security;

drop policy if exists rapports_hebdo_select on public.rapports_hebdo;
create policy rapports_hebdo_select on public.rapports_hebdo for select to authenticated
  using (
    (person_id = public.current_person_id() and statut = 'envoye')
    or (person_id <> public.current_person_id() and public.is_downline_of(person_id, public.current_person_id()))
    or public.is_admin()
  );

grant select on public.rapports_hebdo to authenticated;
