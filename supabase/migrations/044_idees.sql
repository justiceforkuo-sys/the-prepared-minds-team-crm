-- ============================================================================
-- Bâtisseur — migration 044 : « Mes idées » (capture à la voix ou au texte, tiroirs)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- « Le cerveau est fait pour avoir des idées, pas pour les garder » (David Allen).
--   idees   : l'idée brute est TOUJOURS conservée ; la reformulation, le tiroir, la flèche, les
--             questions, la faisabilité et la prochaine action sont proposés par l'IA et corrigeables.
--             Privées par défaut ; partagées seulement si le collaborateur choisit une personne.
--   tiroirs : liste modifiable. owner_id null = liste par défaut (version simplifiée) ; une personne
--             peut avoir sa propre liste (ex. les 31 tiroirs de Justice).
-- ============================================================================

create table if not exists public.tiroirs (
  id serial primary key,
  owner_id uuid references public.people (id) on delete cascade,
  numero integer not null,
  nom text not null,
  famille text
);

create index if not exists tiroirs_owner_idx on public.tiroirs (owner_id, numero);

-- Liste par défaut : version simplifiée, à remplacer / compléter depuis Admin
insert into public.tiroirs (owner_id, numero, nom, famille)
select null, v.numero, v.nom, v.famille
from (values
  (1, 'Prospection et nouveaux clients', 'Business'),
  (2, 'Suivi et fidélisation des clients', 'Business'),
  (3, 'Recrutement', 'Équipe'),
  (4, 'Accompagnement et animation de ma team', 'Équipe'),
  (5, 'Formation et compétences', 'Développement'),
  (6, 'Visibilité, LinkedIn et contenu', 'Business'),
  (7, 'Organisation, agenda et outils', 'Organisation'),
  (8, 'Finances personnelles', 'Vie'),
  (9, 'Vision d''ensemble et projets de vie', 'Vie'),
  (10, 'À explorer plus tard', 'Divers')
) as v(numero, nom, famille)
where not exists (select 1 from public.tiroirs where owner_id is null);

create table if not exists public.idees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.people (id) on delete cascade,
  cree_le timestamptz not null default now(),
  source text not null default 'texte' check (source in ('voix', 'texte')),
  texte_brut text not null,
  reformulation text,
  tiroir text,
  fleche text check (fleche in ('Ma team', 'Vision d''ensemble')),
  questions jsonb,
  faisabilite text,
  prochaine_action text,
  action_date date,
  statut text not null default 'a_traiter' check (statut in ('a_traiter', 'en_action', 'classee')),
  partagee_avec uuid references public.people (id) on delete set null,
  traitement_ia text not null default 'en_attente' check (traitement_ia in ('en_attente', 'fait', 'erreur')),
  traitement_erreur text,
  convertie_en text check (convertie_en in ('tache', 'prospect', 'candidature')),
  maj_le timestamptz not null default now()
);

create index if not exists idees_user_idx on public.idees (user_id, statut, cree_le desc);
create index if not exists idees_shared_idx on public.idees (partagee_avec);

alter table public.tiroirs enable row level security;
alter table public.idees enable row level security;

drop policy if exists tiroirs_select on public.tiroirs;
create policy tiroirs_select on public.tiroirs for select to authenticated using (true);
drop policy if exists tiroirs_write on public.tiroirs;
create policy tiroirs_write on public.tiroirs for all to authenticated
  using (public.is_admin() or owner_id = public.current_person_id())
  with check (public.is_admin() or owner_id = public.current_person_id());

-- Une idée est privée : son auteur, et la personne avec qui il choisit de la partager
drop policy if exists idees_select on public.idees;
create policy idees_select on public.idees for select to authenticated
  using (user_id = public.current_person_id() or partagee_avec = public.current_person_id());
drop policy if exists idees_write on public.idees;
create policy idees_write on public.idees for all to authenticated
  using (user_id = public.current_person_id())
  with check (user_id = public.current_person_id());

grant select, insert, update, delete on public.tiroirs, public.idees to authenticated;
grant usage, select on sequence public.tiroirs_id_seq to authenticated;
