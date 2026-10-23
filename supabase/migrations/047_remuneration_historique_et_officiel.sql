-- ============================================================================
-- Bâtisseur — migration 047 : production comptée = historique du CRM avant août + production officielle OVB depuis août
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Précision (22 oct. 2026, diplômes OVB) : Samuel est FT2 depuis le 29.01.2026 et FT3 depuis le 04.06.2026 ;
-- Nana est FT3 depuis le 01.05.2026. Ils produisaient donc bien avant août : le chargement initial du CRM
-- (contrats « manuel » datés du 7 juillet) contient cet historique et doit compter.
--   - contrats comptés : tout ce qui date d'avant le 1er août 2026 (historique du CRM)
--     + depuis le 1er août, uniquement les contrats confirmés par la liste OVB (source = 'ovb') ;
--   - rang à la souscription : dates de passage FT2 / FT3 (people.ft2_at, people.ft3_at) pour les contrats datés
--     de façon réelle ; unités cumulées pour le chargement initial ; plafonné au rang actuel et à FT3.
-- ============================================================================

alter table public.people add column if not exists ft3_at date;

-- Le garde-fou de 039 couvre aussi la date de passage FT3 (réservée à l'admin).
create or replace function public.people_guard_parcours()
returns trigger
language plpgsql
as $g$
begin
  if (new.parcours_statut is distinct from old.parcours_statut
      or new.integration_date is distinct from old.integration_date
      or new.statut_reglementaire is distinct from old.statut_reglementaire
      or new.agrement_statut is distinct from old.agrement_statut
      or new.agrement_depose_at is distinct from old.agrement_depose_at
      or new.agrement_fsma_at is distinct from old.agrement_fsma_at
      or new.ft2_at is distinct from old.ft2_at
      or new.ft3_at is distinct from old.ft3_at
      or new.autonome_at is distinct from old.autonome_at)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Ces champs ne sont modifiables que par un administrateur.';
  end if;
  return new;
end;
$g$;

update public.people set ft2_at = date '2026-01-29', ft3_at = date '2026-06-04' where slug = 'samuel';
update public.people set ft3_at = date '2026-05-01' where slug = 'nana';

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

  select id, rank, agrement_fsma_at, ft2_at, ft3_at into v_person from public.people where id = p_user;
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
           cp.statut_collab_souscription as statut0,
           (cp.source = 'ovb' or cp.signed_on is not null) as date_reelle
    from public.client_policies cp
    join public.clients c on c.id = cp.client_id
    where c.owner_id = p_user
      and (cp.source = 'ovb' or coalesce(cp.signed_on, cp.created_at::date) < date '2026-08-01')
    order by coalesce(cp.signed_on, cp.created_at::date), cp.created_at, cp.id
  loop
    -- rang à la souscription : d'après les dates de passage FT2 / FT3 (diplômes) quand la date du contrat est réelle ;
    -- sinon (chargement initial du CRM) d'après les unités cumulées (1 000 -> FT2, 3 000 -> FT3). Plafonné au rang actuel et à FT3.
    v_rang := coalesce(
      r.rang0,
      public.remu_rang_min(
        public.remu_rang_min(
          case
            when r.date_reelle and (v_person.ft2_at is not null or v_person.ft3_at is not null) then
              case
                when v_person.ft3_at is not null and r.signed >= v_person.ft3_at then 'JFAIII'
                when v_person.ft2_at is not null and r.signed >= v_person.ft2_at then 'JFAII'
                else 'JFAI'
              end
            else public.remu_rang_pour_cumul(v_cumul)
          end,
          v_person.rank
        ),
        'JFAIII'
      )
    );
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
      and (cp.source = 'ovb' or coalesce(cp.signed_on, cp.created_at::date) < date '2026-08-01')
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
