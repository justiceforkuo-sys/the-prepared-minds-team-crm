create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  assigned_by uuid not null references public.people (id) on delete cascade,
  assigned_to uuid not null references public.people (id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select" on public.tasks
  for select using (
    assigned_to = current_person_id() or assigned_by = current_person_id() or is_admin()
  );
create policy "tasks_insert" on public.tasks
  for insert with check (assigned_by = current_person_id());
create policy "tasks_update" on public.tasks
  for update using (
    assigned_to = current_person_id() or assigned_by = current_person_id() or is_admin()
  );
create policy "tasks_delete" on public.tasks
  for delete using (assigned_by = current_person_id() or is_admin());

grant select, insert, update, delete on public.tasks to authenticated;
