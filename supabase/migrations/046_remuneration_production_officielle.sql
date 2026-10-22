-- ============================================================================
-- Bâtisseur — migration 046 : la rémunération des nouveaux s'appuie sur la production officielle OVB
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Constat (22 oct. 2026) : la liste officielle des contrats saisis par OVB (RennListe, depuis août)
-- est la référence. Les contrats « manuel » (dont le gros chargement du 7 juillet) ne sont pas de la
-- production payée : ils faussaient l'aperçu (ex. Samuel : 5 287 unités dans le CRM contre 650 chez OVB).
--   - seuls les contrats source = 'ovb' comptent (forfaits, clients, unités mises de côté) ;
--     un contrat saisi à la main devient officiel au prochain import de la liste OVB ;
--   - rang à la souscription : le rang OVB de la personne (plafonné à FT3), au lieu d'un rang déduit
--     des unités cumulées du CRM.
-- ============================================================================

-- Recalcule (ou, avec p_apply = false, simule sans rien écrire) la rémunération d'un collaborateur.
create or replace function public.remu_recalculer(p_user uuid, p_apply boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person record;
  r record;
  v_cumul numeric := 0;
  v_rang text;
  v_val numeric;
  v_statut text;
  v_pre boolean;
  v_reserve numeric := 0;
  v_units numeric := 0;
  v_n integer := 0;
  v_forfaits numeric := 0;
  v_montant numeric;
  v_ids uuid[] := '{}';
  v_exist record;
  v_ratt record;
  v_ratt_calc numeric;
  v_par_rang jsonb := '{}'::jsonb;
begin
  -- les mises à jour faites ici déclenchent les triggers : on ne se rappelle jamais soi-même
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  select id, rank, agrement_fsma_at into v_person from public.people where id = p_user;
  if not found then
    return null;
  end if;

  -- 1. Contrats, dans l'ordre de signature : rang et valeur du point à la souscription
  for r in
    select cp.id,
           coalesce(cp.units, 0) as units,
           coalesce(cp.signed_on, cp.created_at::date) as signed,
           cp.rang_a_la_souscription as rang0,
           cp.valeur_point_souscription as val0,
           cp.statut_collab_souscription as statut0
    from public.client_policies cp
    join public.clients c on c.id = cp.client_id
    where c.owner_id = p_user
      and cp.source = 'ovb'
    order by coalesce(cp.signed_on, cp.created_at::date), cp.created_at, cp.id
  loop
    v_rang := coalesce(r.rang0, public.remu_rang_min(v_person.rank, 'JFAIII'));
    v_val := coalesce(r.val0, (select valeur from public.valeur_point_rang where rang = v_rang), 0);
    v_pre := v_person.agrement_fsma_at is null or r.signed < v_person.agrement_fsma_at;
    v_statut := coalesce(r.statut0, case when v_pre then 'apporteur' else 'sous_agent' end);

    if p_apply and (r.rang0 is null or r.val0 is null or r.statut0 is null) then
      update public.client_policies
      set signed_on = coalesce(signed_on, r.signed),
          rang_a_la_souscription = v_rang,
          valeur_point_souscription = v_val,
          statut_collab_souscription = v_statut
      where id = r.id;
    end if;

    v_units := v_units + r.units;
    if v_pre then
      v_reserve := v_reserve + r.units * v_val;
      v_par_rang := jsonb_set(v_par_rang, array[v_rang], to_jsonb(coalesce((v_par_rang ->> v_rang)::numeric, 0) + r.units));
    end if;
    v_cumul := v_cumul + r.units;
  end loop;

  -- 2. Forfaits clients (avant l'agrément) : un client = un forfait, rang dans le compteur cumulatif
  for r in
    select c.id as client_id,
           min(coalesce(cp.signed_on, cp.created_at::date)) as first_signed
    from public.clients c
    join public.client_policies cp on cp.client_id = c.id
    where c.owner_id = p_user
      and cp.source = 'ovb'
    group by c.id, c.created_at
    order by min(coalesce(cp.signed_on, cp.created_at::date)), c.created_at, c.id
  loop
    if v_person.agrement_fsma_at is not null and r.first_signed >= v_person.agrement_fsma_at then
      continue;
    end if;
    v_n := v_n + 1;
    v_ids := array_append(v_ids, r.client_id);
    v_montant := coalesce(public.remu_forfait_montant(v_n, r.first_signed), 0);

    select * into v_exist from public.forfaits_clients where user_id = p_user and client_id = r.client_id;
    if found and v_exist.paye_le is not null then
      v_forfaits := v_forfaits + v_exist.montant; -- déjà payé : jamais recalculé
    else
      v_forfaits := v_forfaits + v_montant;
      if p_apply then
        insert into public.forfaits_clients (user_id, client_id, rang_client, montant, signe_le)
        values (p_user, r.client_id, v_n, v_montant, r.first_signed)
        on conflict (user_id, client_id) do update
          set rang_client = excluded.rang_client, montant = excluded.montant, signe_le = excluded.signe_le;
      end if;
    end if;
  end loop;

  if p_apply then
    delete from public.forfaits_clients
    where user_id = p_user and paye_le is null and not (client_id = any (v_ids));
  end if;

  -- 3. Rattrapage : calculé une seule fois, à la date d'agrément, jamais négatif
  select * into v_ratt from public.rattrapages where user_id = p_user;
  v_ratt_calc := greatest(0, round(v_reserve - v_forfaits, 2));
  if p_apply and v_person.agrement_fsma_at is not null and v_ratt.user_id is null then
    insert into public.rattrapages (user_id, calcule_le, valeur_unites, forfaits_payes, montant)
    values (p_user, current_date, round(v_reserve, 2), round(v_forfaits, 2), v_ratt_calc)
    on conflict (user_id) do nothing;
  end if;

  return jsonb_build_object(
    'clients', v_n,
    'forfaits', round(v_forfaits, 2),
    'unites_cumulees', round(v_units, 2),
    'reserve', round(v_reserve, 2),
    'unites_par_rang', v_par_rang,
    'rattrapage_si_agrement_aujourdhui', v_ratt_calc,
    'rattrapage_calcule', case when v_ratt.user_id is not null then v_ratt.montant end,
    'agrement', v_person.agrement_fsma_at
  );
end;
$$;
