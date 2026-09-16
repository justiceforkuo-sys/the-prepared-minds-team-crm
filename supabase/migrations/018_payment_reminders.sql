-- ============================================================================
-- Bâtisseur — migration : rappels de premier versement (email automatique)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- payment_reminders : une date programmée par contrat pour relancer le client
-- sur son premier versement. Un cron quotidien (src/app/api/cron/payment-
-- reminders) envoie l'email et passe le statut à 'sent'. Le collaborateur peut
-- l'annuler avant l'échéance ('cancelled') si le client a déjà payé.
-- ============================================================================

create table public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  client_policy_id uuid not null references public.client_policies (id) on delete cascade,
  created_by uuid not null references public.people (id) on delete cascade,
  remind_on date not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_reminders enable row level security;

-- Lecture/écriture réservées au propriétaire du client concerné (comme
-- clients_select_own_or_downline / prospects_own_only) ou à l'admin.
create policy "payment_reminders_select" on public.payment_reminders
  for select using (
    exists (
      select 1 from public.client_policies cp
      join public.clients c on c.id = cp.client_id
      where cp.id = payment_reminders.client_policy_id
        and c.owner_id = current_person_id()
    )
    or is_admin()
  );

create policy "payment_reminders_insert" on public.payment_reminders
  for insert with check (
    created_by = current_person_id()
    and exists (
      select 1 from public.client_policies cp
      join public.clients c on c.id = cp.client_id
      where cp.id = payment_reminders.client_policy_id
        and c.owner_id = current_person_id()
    )
  );

create policy "payment_reminders_update" on public.payment_reminders
  for update using (
    exists (
      select 1 from public.client_policies cp
      join public.clients c on c.id = cp.client_id
      where cp.id = payment_reminders.client_policy_id
        and c.owner_id = current_person_id()
    )
    or is_admin()
  );

create policy "payment_reminders_delete" on public.payment_reminders
  for delete using (
    exists (
      select 1 from public.client_policies cp
      join public.clients c on c.id = cp.client_id
      where cp.id = payment_reminders.client_policy_id
        and c.owner_id = current_person_id()
    )
    or is_admin()
  );

grant select, insert, update, delete on public.payment_reminders to authenticated;
