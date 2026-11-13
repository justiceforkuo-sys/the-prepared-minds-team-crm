-- ============================================================================
-- Bâtisseur — migration 068 : discussion instantanée (salon de la team + messages privés)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
--   chat_messages  : un message. recipient_id vide = salon de toute la team ; sinon message privé.
--                    kind 'victoire' = message automatique (contrat signé, 50 appels, étape validée, module réussi).
--   chat_reactions : une réaction (émoji) d'une personne à un message.
--   chat_reads     : jusqu'où chaque personne a lu chaque conversation (messages non lus).
-- Lecture : le salon est lisible par tous ; un message privé seulement par les deux personnes (les administrateurs ne lisent
-- pas les messages privés). Écritures : par le serveur seulement. Historique : 90 jours (nettoyage quotidien).

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.people (id) on delete cascade,
  recipient_id uuid references public.people (id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  kind text not null default 'message' check (kind in ('message', 'victoire')),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);
create index if not exists chat_messages_dm_idx on public.chat_messages (recipient_id, author_id, created_at desc);

create table if not exists public.chat_reactions (
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (message_id, person_id, emoji)
);

create table if not exists public.chat_reads (
  person_id uuid not null references public.people (id) on delete cascade,
  conv text not null,
  last_read_at timestamptz not null default now(),
  primary key (person_id, conv)
);

alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.chat_reads enable row level security;

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages for select to authenticated
  using (recipient_id is null or author_id = public.current_person_id() or recipient_id = public.current_person_id());

drop policy if exists chat_reactions_select on public.chat_reactions;
create policy chat_reactions_select on public.chat_reactions for select to authenticated
  using (exists (
    select 1 from public.chat_messages m
    where m.id = message_id
      and (m.recipient_id is null or m.author_id = public.current_person_id() or m.recipient_id = public.current_person_id())
  ));

drop policy if exists chat_reads_select on public.chat_reads;
create policy chat_reads_select on public.chat_reads for select to authenticated
  using (person_id = public.current_person_id());

grant select on public.chat_messages, public.chat_reactions, public.chat_reads to authenticated;

-- Temps réel : les nouveaux messages et réactions arrivent sans recharger la page
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_reactions') then
    alter publication supabase_realtime add table public.chat_reactions;
  end if;
end $$;

-- Messages de victoire automatiques dans le salon (jamais de nom de client ni de montant).
-- Chaque déclencheur ignore ses propres erreurs : il ne peut jamais bloquer l'action d'origine.
create or replace function public.chat_victoire(p_person uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_messages (author_id, recipient_id, body, kind) values (p_person, null, p_body, 'victoire');
exception when others then
  null;
end;
$$;

create or replace function public.chat_trg_contrat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_owner uuid;
begin
  if new.deal_stage = 'Contrat signé' and (tg_op = 'INSERT' or old.deal_stage is distinct from new.deal_stage) then
    select owner_id into v_owner from public.clients where id = new.client_id;
    if v_owner is not null then
      perform public.chat_victoire(v_owner, 'vient de signer un contrat. Félicitations !');
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists chat_contrat on public.client_policies;
create trigger chat_contrat after insert or update of deal_stage on public.client_policies
  for each row execute function public.chat_trg_contrat();

create or replace function public.chat_trg_appels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  select count(*) into v_n from public.call_log
   where person_id = new.person_id
     and (called_at at time zone 'Europe/Brussels') >= date_trunc('week', now() at time zone 'Europe/Brussels');
  if v_n = 50 then
    perform public.chat_victoire(new.person_id, 'vient d''atteindre ses 50 appels de la semaine. Bravo !');
  end if;
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists chat_appels on public.call_log;
create trigger chat_appels after insert on public.call_log
  for each row execute function public.chat_trg_appels();

create or replace function public.chat_trg_etape()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_titre text;
begin
  if new.valide_at is not null and (tg_op = 'INSERT' or old.valide_at is null) then
    -- une seule annonce par tranche de 10 minutes et par personne (évite d'inonder le salon quand un mentor valide plusieurs étapes d'un coup)
    if not exists (
      select 1 from public.chat_messages
       where kind = 'victoire' and author_id = new.user_id and body like 'vient de valider%' and created_at > now() - interval '10 minutes'
    ) then
      select titre into v_titre from public.parcours_etapes where id = new.etape_id;
      perform public.chat_victoire(new.user_id, 'vient de valider une étape de son onboarding : « ' || coalesce(v_titre, 'étape') || ' ». Bravo !');
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists chat_etape on public.parcours_progression;
create trigger chat_etape after insert or update of valide_at on public.parcours_progression
  for each row execute function public.chat_trg_etape();

create or replace function public.chat_trg_module()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'reussi' and (tg_op = 'INSERT' or old.statut is distinct from new.statut) then
    perform public.chat_victoire(new.user_id, 'vient de réussir le module ' || new.module || ' de l''agrément FSMA. Bravo !');
  end if;
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists chat_module on public.modules_fsma;
create trigger chat_module after insert or update of statut on public.modules_fsma
  for each row execute function public.chat_trg_module();
