-- ============================================================================
-- Bâtisseur — migration : affaires (Lot 2) — étapes, dates, décomptes
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Une "affaire" = une ligne client_policies. On y ajoute :
--   - deal_stage : Offre en cours → Contrat signé → Apparu en Rennelist →
--     Décompté → Non paiement → Conclue (Kanban + validation des décomptes)
--   - prime mensuelle / capital saisis (base du calcul d'unités AXA/Vivium/DELA)
--   - dates de signature / d'effet, mode de paiement
--   - production_month : mois de production (qualité PVQ1/PVQ2)
--   - decompte_month / decompted_at : mois de paiement validé
-- Les polices importées d'OVB (source = 'ovb') sont déjà décomptées.
-- ============================================================================

alter table public.client_policies
  add column if not exists deal_stage text
    check (deal_stage in ('Offre en cours', 'Contrat signé', 'Apparu en Rennelist', 'Décompté', 'Non paiement', 'Conclue')),
  add column if not exists monthly_premium numeric,
  add column if not exists capital numeric,
  add column if not exists signed_on date,
  add column if not exists effective_on date,
  add column if not exists payment_mode text
    check (payment_mode in ('Virement bancaire', 'Domiciliation')),
  add column if not exists production_month text
    check (production_month ~ '^[0-9]{4}-[0-9]{2}$'),
  add column if not exists decompte_month text
    check (decompte_month ~ '^[0-9]{4}-[0-9]{2}$'),
  add column if not exists decompted_at timestamptz;

update public.client_policies
set
  deal_stage = case when source = 'ovb' then 'Décompté' else 'Contrat signé' end,
  production_month = to_char(created_at, 'YYYY-MM')
where deal_stage is null;

create or replace function public.client_policies_defaults()
returns trigger
language plpgsql
as $$
begin
  new.deal_stage := coalesce(
    new.deal_stage,
    case when new.source = 'ovb' then 'Décompté' else 'Contrat signé' end
  );
  new.production_month := coalesce(new.production_month, to_char(coalesce(new.created_at, now()), 'YYYY-MM'));
  return new;
end;
$$;

drop trigger if exists client_policies_defaults_trg on public.client_policies;
create trigger client_policies_defaults_trg
  before insert on public.client_policies
  for each row execute function public.client_policies_defaults();
