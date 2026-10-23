-- ============================================================================
-- Bâtisseur — migration 049 : saisie manuelle de la rémunération des nouveaux (FT1 à FT3)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- L'administrateur peut encoder lui-même, pour un collaborateur, le nombre de clients, les forfaits dus
-- et payés, les unités, la valeur des unités mises de côté et le rattrapage. Tant qu'une ligne existe ici,
-- le CRM affiche ces valeurs à la place du calcul automatique. La supprimer rétablit le calcul automatique.

create table if not exists public.remu_manuel (
  user_id uuid primary key references public.people (id) on delete cascade,
  nb_clients integer not null default 0,
  forfaits_total numeric(10,2) not null default 0,
  forfaits_payes numeric(10,2) not null default 0,
  unites numeric(10,2) not null default 0,
  reserve numeric(10,2) not null default 0,
  rattrapage numeric(10,2),
  note text,
  maj_le timestamptz not null default now()
);

alter table public.remu_manuel enable row level security;

drop policy if exists remu_manuel_select on public.remu_manuel;
create policy remu_manuel_select on public.remu_manuel for select to authenticated
  using (user_id = public.current_person_id() or public.is_admin());

drop policy if exists remu_manuel_admin on public.remu_manuel;
create policy remu_manuel_admin on public.remu_manuel for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.remu_manuel to authenticated;
