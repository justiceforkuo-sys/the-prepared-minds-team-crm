-- ============================================================================
-- Bâtisseur — migration : podium entreprise + historique mensuel par personne
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Ajoute :
--   1. get_company_ranking() : classement de TOUTE l'entreprise sur les unités
--      du mois en cours (pas limité à la descendance de l'appelant) —
--      n'expose que nom/rang/unités, jamais de données client.
--   2. get_person_monthly_production() : unités produites mois par mois
--      (mois vides inclus à 0) pour une personne donnée, autorisé pour
--      soi-même, son sponsor (toute la cascade), ou l'admin.
-- ============================================================================

create or replace function public.get_company_ranking()
returns table (
  person_id uuid,
  name text,
  rank text,
  units_this_month numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.rank,
    coalesce(sum(cp.units) filter (
      where to_char(cp.created_at, 'YYYY-MM') = to_char(now(), 'YYYY-MM')
    ), 0) as units_this_month
  from public.people p
  left join public.clients cl on cl.owner_id = p.id
  left join public.client_policies cp on cp.client_id = cl.id
  where p.active = true
  group by p.id, p.name, p.rank
  order by units_this_month desc;
$$;

grant execute on function public.get_company_ranking() to authenticated;

create or replace function public.get_person_monthly_production(target_id uuid, months_back int default 6)
returns table (
  month text,
  units numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if target_id <> public.current_person_id()
     and not public.is_admin()
     and not public.is_downline_of(target_id, public.current_person_id()) then
    raise exception 'not authorized to view this history';
  end if;

  return query
  select
    to_char(d.month, 'YYYY-MM') as month,
    coalesce(sum(cp.units), 0) as units
  from generate_series(
    date_trunc('month', now()) - (months_back - 1) * interval '1 month',
    date_trunc('month', now()),
    interval '1 month'
  ) d(month)
  left join public.clients cl on cl.owner_id = target_id
  left join public.client_policies cp
    on cp.client_id = cl.id
    and date_trunc('month', cp.created_at) = d.month
  group by d.month
  order by d.month;
end;
$$;

grant execute on function public.get_person_monthly_production(uuid, int) to authenticated;
