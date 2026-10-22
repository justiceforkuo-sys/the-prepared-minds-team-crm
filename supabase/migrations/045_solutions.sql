-- ============================================================================
-- Bâtisseur — migration 045 : bibliothèque des solutions (fiches techniques + conditions générales)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Objectif : que chaque collaborateur connaisse les solutions, pour préparer les modules FSMA
-- (1.1, 1.2, 3.1, 3.2, 4) et les DV1 / DV2.
--   solutions           : une fiche par solution (langage simple, fiscalité avec année de référence,
--                         conditions, exclusions, « quand NE PAS la proposer », FAQ, modules liés)
--   solution_documents  : conditions générales / fiches d'information (PDF dans Supabase Storage),
--                         uniquement des documents des compagnies ou d'OVB Willemot
--   people.peut_editer_solutions : « responsable désigné » en plus de l'admin
-- Aucun contenu n'est inventé : les fiches de départ sont des coquilles vides, non publiées, à
-- rédiger à partir de documents sources (conditions générales, brochures).
-- ============================================================================

alter table public.people add column if not exists peut_editer_solutions boolean not null default false;

create or replace function public.can_edit_solutions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or coalesce((select peut_editer_solutions from public.people where id = public.current_person_id()), false)
$$;

create table if not exists public.solutions (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  famille text not null default 'protection' check (famille in ('protection', 'epargne', 'iard', 'credit')),
  compagnies text[] not null default '{}',
  pour_qui text,
  probleme text,
  fonctionnement text,
  fiscalite text,
  fiscalite_annee integer check (fiscalite_annee is null or fiscalite_annee between 2000 and 2100),
  conditions text,
  exclusions text,
  quand_ne_pas_proposer text,
  faq jsonb not null default '[]'::jsonb,
  modules_fsma text[] not null default '{}',
  liens jsonb not null default '[]'::jsonb,
  unites_info text,
  verifiee_le date,
  verifiee_par uuid references public.people (id) on delete set null,
  publiee boolean not null default false,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solution_documents (
  id uuid primary key default gen_random_uuid(),
  solution_id uuid not null references public.solutions (id) on delete cascade,
  type text not null default 'conditions_generales' check (type in ('conditions_generales', 'fiche_information', 'brochure', 'autre')),
  titre text not null,
  fichier_path text not null,
  version text,
  date_version date,
  source text not null default 'compagnie' check (source in ('compagnie', 'ovb_willemot')),
  source_nom text,
  depose_le timestamptz not null default now(),
  depose_par uuid references public.people (id) on delete set null
);

create index if not exists solution_documents_solution_idx on public.solution_documents (solution_id);

drop trigger if exists solutions_touch_updated_at on public.solutions;
create trigger solutions_touch_updated_at
  before update on public.solutions
  for each row execute function public.touch_updated_at();

-- Solutions de départ : noms seulement (liste modifiable), non publiées, sans contenu
insert into public.solutions (nom, famille, ordre)
select v.nom, v.famille, v.ordre
from (values
  ('Épargne-pension', 'epargne', 1),
  ('PLCI / CPTI', 'epargne', 2),
  ('EIP', 'epargne', 3),
  ('Assurance vie / épargne', 'epargne', 4),
  ('Assurance décès', 'protection', 5),
  ('DELA (obsèques)', 'protection', 6),
  ('Hospitalisation', 'protection', 7),
  ('Revenu garanti', 'protection', 8),
  ('RC professionnelle', 'iard', 9),
  ('Incendie', 'iard', 10),
  ('Familiale', 'iard', 11),
  ('Auto', 'iard', 12),
  ('Crédit hypothécaire', 'credit', 13),
  ('Crédit pont', 'credit', 14)
) as v(nom, famille, ordre)
where not exists (select 1 from public.solutions);

alter table public.solutions enable row level security;
alter table public.solution_documents enable row level security;

-- Lecture : les fiches publiées pour tous ; les brouillons seulement pour l'admin et les responsables
drop policy if exists solutions_select on public.solutions;
create policy solutions_select on public.solutions for select to authenticated
  using (publiee or public.can_edit_solutions());
drop policy if exists solutions_write on public.solutions;
create policy solutions_write on public.solutions for all to authenticated
  using (public.can_edit_solutions()) with check (public.can_edit_solutions());

drop policy if exists solution_documents_select on public.solution_documents;
create policy solution_documents_select on public.solution_documents for select to authenticated
  using (public.can_edit_solutions() or exists (select 1 from public.solutions s where s.id = solution_id and s.publiee));
drop policy if exists solution_documents_write on public.solution_documents;
create policy solution_documents_write on public.solution_documents for all to authenticated
  using (public.can_edit_solutions()) with check (public.can_edit_solutions());

grant select, insert, update, delete on public.solutions, public.solution_documents to authenticated;

-- Stockage privé des PDF (lecture par lien signé temporaire, dépôt réservé à l'admin et aux responsables)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('solutions-docs', 'solutions-docs', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists solutions_docs_read on storage.objects;
create policy solutions_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'solutions-docs');
drop policy if exists solutions_docs_insert on storage.objects;
create policy solutions_docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'solutions-docs' and public.can_edit_solutions());
drop policy if exists solutions_docs_update on storage.objects;
create policy solutions_docs_update on storage.objects for update to authenticated
  using (bucket_id = 'solutions-docs' and public.can_edit_solutions());
drop policy if exists solutions_docs_delete on storage.objects;
create policy solutions_docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'solutions-docs' and public.can_edit_solutions());
