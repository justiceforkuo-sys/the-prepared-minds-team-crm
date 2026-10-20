-- ============================================================================
-- Bâtisseur — migration 041 : rémunération des collaborateurs démarrés à partir du 1er janvier 2026
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Deux statuts successifs :
--   1. Apporteur d'affaires (avant l'agrément FSMA) : un forfait par client, barème progressif
--      (tranches, comme l'impôt). Les unités sont calculées dès la première signature et mises de
--      côté dans une réserve de rattrapage (valeur non payée).
--   2. Sous-agent OVB Willemot (à partir de people.agrement_fsma_at) : chaque nouveau contrat est
--      payé en unités × valeur du point du rang à la souscription. Rattrapage calculé UNE fois :
--      max(0, Σ unités × valeur du point (avant agrément) − Σ forfaits clients).
-- Réutilise l'existant : barème du contrat d'apporteur (apporteur-fee.ts, désormais en table),
-- grille de valeur d'unité par rang, client_policies (= contrats), people.agrement_fsma_at (bloc 5).
-- Le périmètre est piloté par people.date_demarrage (>= 2026-01-01). Aucune valeur n'est posée ici :
-- l'historique est recalculé à la demande (aperçu sans écriture, puis application).
-- ============================================================================

alter table public.people add column if not exists date_demarrage date;

-- ---- Paramètres modifiables par l'admin ------------------------------------
create table if not exists public.bareme_forfait_client (
  id serial primary key,
  rang_min integer not null check (rang_min >= 1),
  rang_max integer check (rang_max is null or rang_max >= rang_min),
  montant numeric(8,2) not null check (montant >= 0),
  date_effet date not null default '2026-01-01'
);

insert into public.bareme_forfait_client (rang_min, rang_max, montant, date_effet)
select v.rang_min, v.rang_max, v.montant, v.date_effet
from (values
  (1, 5, 75, date '2026-01-01'),
  (6, 15, 125, date '2026-01-01'),
  (16, 30, 150, date '2026-01-01'),
  (31, 50, 175, date '2026-01-01'),
  (51, 75, 200, date '2026-01-01'),
  (76, null::integer, 225, date '2026-01-01')
) as v(rang_min, rang_max, montant, date_effet)
where not exists (select 1 from public.bareme_forfait_client);

create table if not exists public.valeur_point_rang (
  rang text primary key,
  valeur numeric(6,2) not null check (valeur >= 0)
);

-- FT1 = JFAI, FT2 = JFAII, FT3 = JFAIII ; rangs supérieurs : grille existante du CRM
insert into public.valeur_point_rang (rang, valeur) values
  ('JFAI', 1.50), ('JFAII', 2.00), ('JFAIII', 2.50), ('FA', 3.50),
  ('FC', 4.50), ('CD', 5.00), ('CR', 5.50), ('CN', 6.00)
on conflict (rang) do nothing;

-- ---- Contrats : rang et valeur du point figés à la souscription ------------
alter table public.client_policies
  add column if not exists signed_on date,
  add column if not exists rang_a_la_souscription text,
  add column if not exists valeur_point_souscription numeric(6,2),
  add column if not exists statut_collab_souscription text
    check (statut_collab_souscription in ('apporteur', 'sous_agent'));

-- ---- Forfaits clients et rattrapages ---------------------------------------
create table if not exists public.forfaits_clients (
  user_id uuid not null references public.people (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  rang_client integer not null,
  montant numeric(8,2) not null,
  signe_le date not null,
  paye_le date,
  primary key (user_id, client_id)
);

create table if not exists public.rattrapages (
  user_id uuid primary key references public.people (id) on delete cascade,
  calcule_le date not null,
  valeur_unites numeric(10,2) not null,
  forfaits_payes numeric(10,2) not null,
  montant numeric(10,2) not null,
  verse_le date,
  note text
);

-- ---- Fonctions de calcul ----------------------------------------------------
create or replace function public.remu_forfait_montant(p_rang integer, p_at date)
returns numeric
language sql
stable
set search_path = public
as $$
  select b.montant
  from public.bareme_forfait_client b
  where b.rang_min <= p_rang
    and (b.rang_max is null or b.rang_max >= p_rang)
    and b.date_effet <= p_at
  order by b.date_effet desc, b.rang_min desc
  limit 1
$$;

-- Rang déduit des unités cumulées avant le contrat (règles du CRM : 1 000 -> FT2, 3 000 -> FT3)
create or replace function public.remu_rang_pour_cumul(p_cumul numeric)
returns text
language sql
immutable
as $$
  select case when p_cumul >= 3000 then 'JFAIII' when p_cumul >= 1000 then 'JFAII' else 'JFAI' end
$$;

create or replace function public.remu_rang_min(a text, b text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(array_position(array['JFAI','JFAII','JFAIII','FA','FC','CD','CR','CN'], a), 99)
      <= coalesce(array_position(array['JFAI','JFAII','JFAIII','FA','FC','CD','CR','CN'], b), 99)
    then a else b end
$$;

create or replace function public.remu_concerned(p_person uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select date_demarrage >= date '2026-01-01' from public.people where id = p_person), false)
$$;

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
    order by coalesce(cp.signed_on, cp.created_at::date), cp.created_at, cp.id
  loop
    v_rang := coalesce(r.rang0, public.remu_rang_min(public.remu_rang_pour_cumul(v_cumul), v_person.rank));
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

revoke all on function public.remu_recalculer(uuid, boolean) from public, anon, authenticated;
grant execute on function public.remu_recalculer(uuid, boolean) to service_role;

-- ---- Triggers : un nouveau contrat enregistre son rang / sa valeur de point, puis tout se recalcule
create or replace function public.client_policies_remu_before()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_p record;
  v_signed date;
begin
  select owner_id into v_owner from public.clients where id = new.client_id;
  if v_owner is null or not public.remu_concerned(v_owner) then
    return new;
  end if;
  select rank, agrement_fsma_at into v_p from public.people where id = v_owner;
  v_signed := coalesce(new.signed_on, new.created_at::date, current_date);
  new.signed_on := v_signed;
  new.rang_a_la_souscription := coalesce(new.rang_a_la_souscription, v_p.rank);
  new.valeur_point_souscription := coalesce(
    new.valeur_point_souscription,
    (select valeur from public.valeur_point_rang where rang = new.rang_a_la_souscription)
  );
  new.statut_collab_souscription := coalesce(
    new.statut_collab_souscription,
    case when v_p.agrement_fsma_at is null or v_signed < v_p.agrement_fsma_at then 'apporteur' else 'sous_agent' end
  );
  return new;
end;
$$;

drop trigger if exists client_policies_remu_before_trg on public.client_policies;
create trigger client_policies_remu_before_trg
  before insert on public.client_policies
  for each row execute function public.client_policies_remu_before();

create or replace function public.client_policies_remu_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.clients where id = coalesce(new.client_id, old.client_id);
  if v_owner is not null and public.remu_concerned(v_owner) then
    perform public.remu_recalculer(v_owner, true);
  end if;
  return null;
end;
$$;

drop trigger if exists client_policies_remu_after_trg on public.client_policies;
create trigger client_policies_remu_after_trg
  after insert or delete or update of units, signed_on, client_id on public.client_policies
  for each row execute function public.client_policies_remu_after();

-- À l'obtention de l'agrément : passage sous-agent + rattrapage (une seule fois)
create or replace function public.people_remu_agrement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.remu_concerned(new.id) then
    perform public.remu_recalculer(new.id, true);
  end if;
  return null;
end;
$$;

drop trigger if exists people_remu_agrement_trg on public.people;
create trigger people_remu_agrement_trg
  after update of agrement_fsma_at on public.people
  for each row
  when (old.agrement_fsma_at is distinct from new.agrement_fsma_at and new.agrement_fsma_at is not null)
  execute function public.people_remu_agrement();

-- ---- Sécurité (RLS) ------------------------------------------------------------
alter table public.bareme_forfait_client enable row level security;
alter table public.valeur_point_rang enable row level security;
alter table public.forfaits_clients enable row level security;
alter table public.rattrapages enable row level security;

drop policy if exists bareme_select on public.bareme_forfait_client;
create policy bareme_select on public.bareme_forfait_client for select to authenticated using (true);
drop policy if exists bareme_admin on public.bareme_forfait_client;
create policy bareme_admin on public.bareme_forfait_client for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists valeur_point_select on public.valeur_point_rang;
create policy valeur_point_select on public.valeur_point_rang for select to authenticated using (true);
drop policy if exists valeur_point_admin on public.valeur_point_rang;
create policy valeur_point_admin on public.valeur_point_rang for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists forfaits_select on public.forfaits_clients;
create policy forfaits_select on public.forfaits_clients for select to authenticated
  using (user_id = public.current_person_id() or public.is_admin());
drop policy if exists forfaits_update_admin on public.forfaits_clients;
create policy forfaits_update_admin on public.forfaits_clients for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists rattrapages_select on public.rattrapages;
create policy rattrapages_select on public.rattrapages for select to authenticated
  using (user_id = public.current_person_id() or public.is_admin());
drop policy if exists rattrapages_update_admin on public.rattrapages;
create policy rattrapages_update_admin on public.rattrapages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.bareme_forfait_client, public.valeur_point_rang, public.forfaits_clients, public.rattrapages to authenticated;
grant insert, update, delete on public.bareme_forfait_client, public.valeur_point_rang to authenticated;
grant update on public.forfaits_clients, public.rattrapages to authenticated;
grant usage, select on sequence public.bareme_forfait_client_id_seq to authenticated;
