-- ============================================================================
-- Bâtisseur — migration : anti-doublon cross-collaborateur
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- check_existing_contact() : cherche un nom (prospect ou client) chez TOUS les
-- autres collaborateurs, pour avertir avant un doublon involontaire — sans
-- jamais exposer les notes, le pipeline ou les coordonnées de l'autre
-- collaborateur. Même esprit que get_company_ranking() : lecture company-wide
-- ouverte à tout collaborateur authentifié, mais avec des colonnes
-- volontairement réduites au strict nécessaire.
-- ============================================================================

create or replace function public.check_existing_contact(p_name text)
returns table (source text, matched_name text, collaborateur text, since timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select 'prospect'::text as source, pr.name as matched_name, pe.name as collaborateur, pr.created_at as since
  from public.prospects pr
  join public.people pe on pe.id = pr.owner_id
  where public.name_tokens(pr.name) = public.name_tokens(p_name)
    and pr.owner_id <> current_person_id()
  union all
  select 'client'::text as source, c.name as matched_name, pe.name as collaborateur, c.created_at as since
  from public.clients c
  join public.people pe on pe.id = c.owner_id
  where public.name_tokens(c.name) = public.name_tokens(p_name)
    and c.owner_id <> current_person_id()
  order by since asc
  limit 5;
$$;

grant execute on function public.check_existing_contact(text) to authenticated;
