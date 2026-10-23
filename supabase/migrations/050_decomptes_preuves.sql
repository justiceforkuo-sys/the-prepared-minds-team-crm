-- ============================================================================
-- Bâtisseur — migration 050 : preuves de paiement des décomptes + ajustement du PVQ1
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
--   - decompte_preuves : une ou plusieurs preuves de paiement (PDF ou image) par contrat ; un collaborateur
--     peut décompter ses propres contrats en joignant une preuve ;
--   - bucket privé payment-proofs : accès uniquement par lien signé temporaire, délivré par le serveur
--     à l'administrateur, au collaborateur propriétaire du contrat ;
--   - pvq1_ajustements : correction manuelle du PVQ1 d'un collaborateur pour un mois (administrateurs).
-- Les écritures passent toutes par le serveur (service role) : aucune politique d'écriture n'est ouverte.

create table if not exists public.decompte_preuves (
  id uuid primary key default gen_random_uuid(),
  client_policy_id uuid not null references public.client_policies (id) on delete cascade,
  uploaded_by uuid references public.people (id) on delete set null,
  path text not null,
  filename text not null,
  mime text,
  size_bytes integer,
  created_at timestamptz not null default now()
);
create index if not exists decompte_preuves_policy_idx on public.decompte_preuves (client_policy_id);

alter table public.decompte_preuves enable row level security;
drop policy if exists decompte_preuves_select on public.decompte_preuves;
create policy decompte_preuves_select on public.decompte_preuves for select to authenticated
  using (public.is_admin() or uploaded_by = public.current_person_id());
grant select on public.decompte_preuves to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create table if not exists public.pvq1_ajustements (
  user_id uuid not null references public.people (id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  pct numeric(5,2) not null check (pct >= 0 and pct <= 100),
  note text,
  updated_by uuid references public.people (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.pvq1_ajustements enable row level security;
drop policy if exists pvq1_ajustements_select on public.pvq1_ajustements;
create policy pvq1_ajustements_select on public.pvq1_ajustements for select to authenticated
  using (public.is_admin() or user_id = public.current_person_id());
grant select on public.pvq1_ajustements to authenticated;
