-- ============================================================================
-- Bâtisseur — migration : module "Formation continue" (modules + QCM +
-- déblocage progressif).
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

create table public.training_modules (
  id uuid primary key default gen_random_uuid(),
  order_index integer not null,
  title text not null,
  content text not null default '', -- markdown
  created_at timestamptz not null default now()
);

create table public.training_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules (id) on delete cascade,
  order_index integer not null default 0,
  question text not null,
  options jsonb not null,        -- ["Réponse A", "Réponse B", ...]
  correct_option integer not null, -- index dans options
  created_at timestamptz not null default now()
);

create table public.training_progress (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  module_id uuid not null references public.training_modules (id) on delete cascade,
  best_score numeric,
  passed boolean not null default false,
  passed_at timestamptz,
  attempts_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (person_id, module_id)
);

alter table public.training_modules enable row level security;
alter table public.training_questions enable row level security;
alter table public.training_progress enable row level security;

create policy "training_modules_select" on public.training_modules for select using (true);
create policy "training_modules_write" on public.training_modules for all
  using (is_admin()) with check (is_admin());

-- correct_option ne doit jamais être lisible par un non-admin : la table de
-- base reste admin-only, les collaborateurs passent par la vue ci-dessous.
create policy "training_questions_admin_all" on public.training_questions for all
  using (is_admin()) with check (is_admin());

create view public.training_questions_quiz as
  select id, module_id, order_index, question, options from public.training_questions;
grant select on public.training_questions_quiz to authenticated;

create policy "training_progress_select" on public.training_progress for select
  using (person_id = current_person_id() or is_admin());
create policy "training_progress_insert_self" on public.training_progress for insert
  with check (person_id = current_person_id());
create policy "training_progress_update_self" on public.training_progress for update
  using (person_id = current_person_id());

grant select, insert, update, delete on public.training_modules to authenticated;
grant select, insert, update, delete on public.training_questions to authenticated;
grant select, insert, update on public.training_progress to authenticated;

-- Note d'architecture : cette fonction est le SEUL endroit qui lit
-- correct_option pour un utilisateur non-admin — via security definer, elle
-- contourne le RLS admin-only de training_questions pour comparer les
-- réponses, sans jamais renvoyer la clé de correction au client. Elle
-- revérifie aussi côté serveur que le module précédent est validé (le
-- verrouillage n'est donc pas qu'un artifice d'UI).
create or replace function public.submit_training_quiz(p_module_id uuid, p_answers jsonb)
returns table(score numeric, passed boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_person_id uuid := current_person_id();
  v_order integer;
  v_prev_ok boolean;
  v_total integer;
  v_correct integer;
  v_score numeric;
  v_passed boolean;
begin
  select order_index into v_order from training_modules where id = p_module_id;

  if v_order > 0 then
    select exists (
      select 1 from training_progress tp
      join training_modules tm on tm.id = tp.module_id
      where tp.person_id = v_person_id and tm.order_index = v_order - 1 and tp.passed
    ) into v_prev_ok;
    if not v_prev_ok then
      raise exception 'Module précédent non validé';
    end if;
  end if;

  select count(*) into v_total from training_questions where module_id = p_module_id;
  select count(*) into v_correct from training_questions tq
    where tq.module_id = p_module_id
    and (p_answers ->> tq.id::text)::integer = tq.correct_option;

  v_score := round(100.0 * v_correct / greatest(v_total, 1), 1);
  v_passed := v_total = 0 or v_score >= 80;

  insert into training_progress (person_id, module_id, best_score, passed, passed_at, attempts_count)
  values (v_person_id, p_module_id, v_score, v_passed, case when v_passed then now() end, 1)
  on conflict (person_id, module_id) do update set
    best_score = greatest(training_progress.best_score, excluded.best_score),
    passed = training_progress.passed or excluded.passed,
    passed_at = coalesce(training_progress.passed_at, excluded.passed_at),
    attempts_count = training_progress.attempts_count + 1,
    updated_at = now();

  return query select v_score, v_passed;
end;
$$;

grant execute on function public.submit_training_quiz(uuid, jsonb) to authenticated;
