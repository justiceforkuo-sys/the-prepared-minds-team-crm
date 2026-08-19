create table public.admin_impersonation_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.people (id) on delete cascade,
  target_id uuid not null references public.people (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.admin_impersonation_log enable row level security;

create policy "impersonation_log_admin_only" on public.admin_impersonation_log
  for all using (is_admin()) with check (is_admin());

grant select, insert, update on public.admin_impersonation_log to authenticated;
