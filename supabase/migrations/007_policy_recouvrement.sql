alter table public.client_policies
  add column unpaid_installments integer,
  add column payment_status text
    check (payment_status in (
      'À contacter', 'Appelé 1x', 'Appelé 2x', 'Appelé 3x + vocal',
      'Promesse (partiel)', 'Mise en réduction (contrat gelé)',
      'Rachat (clôture du contrat)', 'Payé'
    )),
  add column call_1_done boolean not null default false,
  add column call_2_done boolean not null default false,
  add column call_3_done boolean not null default false,
  add column feedback_reason text
    check (feedback_reason in (
      'Feedback direction/compagnie', 'Injoignable / coordonnées KO', 'Autre (voir note)'
    )),
  add column precision_note text;
