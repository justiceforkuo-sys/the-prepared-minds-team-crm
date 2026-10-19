-- ============================================================================
-- Bâtisseur — migration : mois OVB suivants, à partir du 10 de chaque mois
-- ============================================================================
-- Règle retenue : un mois OVB commence le 10 et se termine la veille du 10 suivant (le 9).
-- Les périodes déjà configurées (2026-08 au 12, 2026-09 et 2026-10 au 13) ne sont pas touchées ;
-- on prépare les suivantes jusqu'à fin 2027 pour qu'« ce mois-ci » reste juste sans intervention.
-- L'admin peut toujours corriger une date dans Admin → Périodes OVB.

insert into public.ovb_periods (period_month, start_date)
select to_char(m, 'YYYY-MM'), (date_trunc('month', m) + interval '9 days')::date
from generate_series(date '2026-11-01', date '2027-12-01', interval '1 month') as m
on conflict (period_month) do nothing;
