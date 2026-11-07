-- ============================================================================
-- Bâtisseur — migration 057 : vidéos et supports PDF du Starter Pack (page « Formation »)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
--   - formation_media : une ou plusieurs ressources (vidéo MP4 ou support PDF) rattachées à un module ;
--   - bucket privé formation-media : jamais public, lecture par lien signé temporaire délivré par le serveur
--     à toute personne connectée (candidats en essai compris) ;
--   - dépôt, modification et suppression : administrateur uniquement, via le serveur (service role).
-- Aucune donnée existante n'est touchée.

create table if not exists public.formation_media (
  id uuid primary key default gen_random_uuid(),
  module_id text not null,
  kind text not null check (kind in ('video', 'pdf')),
  title text not null,
  path text not null unique,
  size_bytes bigint,
  ordre integer not null default 0,
  uploaded_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists formation_media_module_idx on public.formation_media (module_id, ordre);

alter table public.formation_media enable row level security;
drop policy if exists formation_media_select on public.formation_media;
create policy formation_media_select on public.formation_media for select to authenticated using (true);
grant select on public.formation_media to authenticated;

-- 50 Mo = plafond par fichier de la formule gratuite de Supabase (à relever dans Storage → Settings si besoin)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('formation-media', 'formation-media', false, 52428800, array['video/mp4', 'application/pdf'])
on conflict (id) do nothing;
