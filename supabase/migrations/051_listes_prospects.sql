-- ============================================================================
-- Bâtisseur — migration 051 : listes de prospects partageables + étape « À contacter »
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
--   - prospect_lists : une liste de prospects (ex. un fichier de contacts importé) appartenant à une personne ;
--   - prospect_list_shares : les personnes avec qui la liste est partagée (lecture ou modification) ;
--   - prospects.list_id : la liste à laquelle appartient un prospect ;
--   - nouvelle étape « À contacter » (avant « Contacté ») pour les contacts pas encore appelés.
-- La RLS de prospects ne change pas (« pipeline personnel ») : un prospect partagé n'entre jamais dans les statistiques
-- de la personne avec qui il est partagé. Elle le voit et le travaille depuis la page « Listes partagées »,
-- dont toutes les écritures passent par le serveur après vérification du droit d'accès.

alter table public.prospects drop constraint if exists prospects_stage_check;
alter table public.prospects add constraint prospects_stage_check
  check (stage in (
    'Contact','Invité','Présentation faite','Suivi','Partenaire','Perdu',
    'Contacté','Répondu','Échange qualifié','Mise en relation obtenue',
    'Nouveau lead client généré','Sans suite',
    'RDV pris','Entretien / Dossier','À contacter'
  ));

create table if not exists public.prospect_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people (id) on delete cascade,
  name text not null,
  source_file text,
  created_at timestamptz not null default now()
);

create table if not exists public.prospect_list_shares (
  list_id uuid not null references public.prospect_lists (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  can_edit boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (list_id, person_id)
);

alter table public.prospects add column if not exists list_id uuid references public.prospect_lists (id) on delete set null;
create index if not exists prospects_list_idx on public.prospects (list_id);

alter table public.prospect_lists enable row level security;
alter table public.prospect_list_shares enable row level security;

-- Fonctions « security definer » : évitent la récursion entre les politiques des deux tables.
create or replace function public.prospect_list_owned(p_list uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.prospect_lists l where l.id = p_list and l.owner_id = public.current_person_id())
$$;

create or replace function public.prospect_list_visible(p_list uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.prospect_list_owned(p_list)
    or exists (select 1 from public.prospect_list_shares s where s.list_id = p_list and s.person_id = public.current_person_id())
$$;

drop policy if exists prospect_lists_select on public.prospect_lists;
create policy prospect_lists_select on public.prospect_lists for select to authenticated
  using (public.prospect_list_visible(id));

drop policy if exists prospect_list_shares_select on public.prospect_list_shares;
create policy prospect_list_shares_select on public.prospect_list_shares for select to authenticated
  using (person_id = public.current_person_id() or public.prospect_list_owned(list_id));

grant select on public.prospect_lists, public.prospect_list_shares to authenticated;
