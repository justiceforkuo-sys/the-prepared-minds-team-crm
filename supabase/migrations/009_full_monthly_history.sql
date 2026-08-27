-- ============================================================================
-- Bâtisseur — migration : historique mensuel complet depuis le début d'activité
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Remplace get_person_monthly_production() : au lieu d'un nombre fixe de mois
-- en arrière, part du mois de création du compte (people.created_at) jusqu'à
-- aujourd'hui — chaque collaborateur voit tout son historique, pas seulement
-- une fenêtre glissante.
-- ============================================================================

drop function if exists public.get_person_monthly_production(uuid, int);

create or replace function public.get_person_monthly_production(target_id uuid)
returns table (
  month text,
  units numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  start_month date;
begin
  if target_id <> public.current_person_id()
     and not public.is_admin()
     and not public.is_downline_of(target_id, public.current_person_id()) then
    raise exception 'not authorized to view this history';
  end if;

  select date_trunc('month', p.created_at)::date into start_month
  from public.people p
  where p.id = target_id;

  if start_month is null then
    start_month := date_trunc('month', now())::date;
  end if;

  return query
  select
    to_char(d.month, 'YYYY-MM') as month,
    coalesce(sum(cp.units), 0) as units
  from generate_series(start_month, date_trunc('month', now())::date, interval '1 month') d(month)
  left join public.clients cl on cl.owner_id = target_id
  left join public.client_policies cp
    on cp.client_id = cl.id
    and date_trunc('month', cp.created_at) = d.month
  group by d.month
  order by d.month;
end;
$$;

grant execute on function public.get_person_monthly_production(uuid) to authenticated;
