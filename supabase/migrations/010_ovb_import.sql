-- ============================================================================
-- Bâtisseur — migration : statut de contrat + import des relevés OVB Willemot
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Ajoute :
--   1. client_policies.policy_status : cycle de vie du contrat (Actif/Arrêté/
--      Racheté/En pause), distinct du statut de Recouvrement (impayés).
--   2. client_policies.source : trace si une police vient d'un import OVB
--      officiel ou d'un encodage manuel dans le CRM.
--   3. name_tokens() : normalise un nom ("Nom, Prénom" ou "Prénom Nom") en
--      tableau de mots triés, pour comparer deux noms sans dépendre de l'ordre.
--   4. import_ovb_contracts() : reconstitue/complète les contrats réels à
--      partir d'un relevé OVB — recale la date des contrats déjà existants
--      (retrouvés par client + montant + unités) au lieu d'en créer des
--      doublons, et ne crée que ce qui manque vraiment. Mode aperçu
--      (do_commit = false) sans écriture, ou mode réel (do_commit = true).
-- ============================================================================

alter table public.client_policies
  add column if not exists policy_status text not null default 'Actif'
    check (policy_status in ('Actif', 'Arrêté', 'Racheté', 'En pause')),
  add column if not exists source text not null default 'manuel'
    check (source in ('manuel', 'ovb'));

create or replace function public.name_tokens(raw text)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select lower(word)
      from unnest(string_to_array(replace(raw, ',', ' '), ' ')) as word
      where trim(word) <> ''
      order by lower(word)
    ),
    '{}'
  )
$$;

create or replace function public.import_ovb_contracts(payload jsonb, do_commit boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  owner uuid;
  client_id uuid;
  matched_policy_id uuid;
  claimed_ids uuid[] := '{}';
  created_clients int := 0;
  matched_count int := 0;
  created_policies int := 0;
  unmatched_collab text[] := '{}';
  month_date date;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  for row_data in select * from jsonb_array_elements(payload)
  loop
    owner := null;
    client_id := null;
    matched_policy_id := null;

    select p.id into owner
    from public.people p
    where public.name_tokens(p.name) = public.name_tokens(row_data->>'collaborateur')
    limit 1;

    if owner is null then
      unmatched_collab := array_append(unmatched_collab, row_data->>'collaborateur');
      continue;
    end if;

    month_date := to_date(row_data->>'mois', 'YYYY-MM');

    select c.id into client_id
    from public.clients c
    where c.owner_id = owner
      and public.name_tokens(c.name) = public.name_tokens(row_data->>'client')
    limit 1;

    if client_id is null then
      created_clients := created_clients + 1;
      if do_commit then
        insert into public.clients (owner_id, name, status)
        values (owner, row_data->>'client', 'Client')
        returning id into client_id;
      end if;
    end if;

    if client_id is not null then
      select cp.id into matched_policy_id
      from public.client_policies cp
      where cp.client_id = client_id
        and abs(cp.worth - (row_data->>'montant')::numeric) < 0.01
        and abs(cp.units - (row_data->>'unites')::numeric) < 0.01
        and cp.id <> all(claimed_ids)
      limit 1;
    end if;

    if matched_policy_id is not null then
      claimed_ids := array_append(claimed_ids, matched_policy_id);
      matched_count := matched_count + 1;
      if do_commit then
        update public.client_policies
        set created_at = month_date, source = 'ovb'
        where id = matched_policy_id;
      end if;
    else
      created_policies := created_policies + 1;
      if do_commit and client_id is not null then
        insert into public.client_policies
          (client_id, partner, product_label, worth, units, created_at, source)
        values (
          client_id,
          row_data->>'partenaire',
          row_data->>'produit',
          (row_data->>'montant')::numeric,
          (row_data->>'unites')::numeric,
          month_date,
          'ovb'
        );
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'matched', matched_count,
    'created_policies', created_policies,
    'created_clients', created_clients,
    'unmatched_collaborators', to_jsonb(unmatched_collab),
    'committed', do_commit
  );
end;
$$;

grant execute on function public.name_tokens(text) to authenticated;
grant execute on function public.import_ovb_contracts(jsonb, boolean) to authenticated;
