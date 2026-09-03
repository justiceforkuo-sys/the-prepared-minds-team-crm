-- ============================================================================
-- Bâtisseur — migration : historique mensuel du budget + catégorie Dons/Famille
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- budget_items devient la liste stable des postes (libellé, catégorie,
-- is_annual) ; budget_entries porte le montant réel, un par poste et par
-- mois — éditer un mois ne touche jamais les précédents.
-- ============================================================================

alter table public.budget_items drop constraint if exists budget_items_category_check;
alter table public.budget_items
  add constraint budget_items_category_check
  check (category in ('Fixe', 'Professionnelle', 'Extra', 'Annuelle', 'Imprévue', 'Dons / Famille'));

create table public.budget_entries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.budget_items (id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (item_id, month)
);

alter table public.budget_entries enable row level security;

create policy "budget_entries_select" on public.budget_entries
  for select using (
    exists (
      select 1 from public.budget_items bi
      where bi.id = budget_entries.item_id
        and (bi.person_id = current_person_id()
             or bi.person_id in (select id from public.people where reports_to = current_person_id())
             or is_admin())
    )
  );

create policy "budget_entries_write" on public.budget_entries
  for all using (
    exists (select 1 from public.budget_items bi where bi.id = budget_entries.item_id and bi.person_id = current_person_id())
  )
  with check (
    exists (select 1 from public.budget_items bi where bi.id = budget_entries.item_id and bi.person_id = current_person_id())
  );

grant select, insert, update, delete on public.budget_entries to authenticated;

-- Migration des données déjà encodées : le montant actuel devient l'entrée
-- du mois en cours (postes récurrents) ou du mois déjà enregistré (Imprévue).
insert into public.budget_entries (item_id, month, amount)
select id, coalesce(month, to_char(now(), 'YYYY-MM')), amount
from public.budget_items
where amount is not null
on conflict (item_id, month) do nothing;

alter table public.budget_items drop column if exists amount;
alter table public.budget_items drop column if exists month;

create or replace function public.get_budget_month(p_person_id uuid, p_month text)
returns table (item_id uuid, label text, category text, is_annual boolean, amount numeric, entry_month text)
language sql
stable
as $$
  select bi.id, bi.label, bi.category, bi.is_annual, coalesce(be.amount, 0), be.month
  from public.budget_items bi
  left join lateral (
    select e.amount, e.month
    from public.budget_entries e
    where e.item_id = bi.id
      and (
        (bi.category = 'Imprévue' and e.month = p_month)
        or (bi.category <> 'Imprévue' and e.month <= p_month)
      )
    order by e.month desc
    limit 1
  ) be on true
  where bi.person_id = p_person_id
  order by bi.category, bi.label;
$$;

grant execute on function public.get_budget_month(uuid, text) to authenticated;
