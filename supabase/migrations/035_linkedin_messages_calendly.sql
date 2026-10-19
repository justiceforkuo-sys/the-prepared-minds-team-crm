-- ============================================================================
-- Bâtisseur — migration : modèles d'équipe LinkedIn, liens Calendly
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- On remplace seulement les fragments concernés (replace) : si l'admin a déjà
-- retouché un modèle ailleurs, ses modifications sont conservées. Les versions
-- personnelles des collaborateurs (owner_id non nul) ne sont pas touchées.

-- A · message 2 : ajoute le lien Calendly
update public.linkedin_templates
set body = replace(body,
  E'Si ça vous parle, 15 minutes au téléphone suffisent pour voir si c''est pertinent.',
  E'Si ça vous parle, 15 minutes suffisent pour voir si c''est pertinent. Vous pouvez choisir un moment ici : {calendly}')
where owner_id is null and grp = 'A' and step = '2' and variant = 'default';

-- B · message 2 : on ne parle plus d'un « bilan de 30 minutes »
update public.linkedin_templates
set body = replace(body, 'je propose un bilan gratuit de 30 minutes,', 'je propose un bilan gratuit,')
where owner_id is null and grp = 'B' and step = '2' and variant = 'default';

-- C · message 2 : ajoute le lien Calendly
update public.linkedin_templates
set body = replace(body,
  'Un café ou un appel de 15 minutes cette semaine ou la suivante ?',
  'Un café ou un appel de 15 minutes cette semaine ou la suivante ? Vous pouvez choisir un moment ici : {calendly}')
where owner_id is null and grp = 'C' and step = '2' and variant = 'default';

-- D · message 2 : 30 minutes
update public.linkedin_templates
set body = replace(body, 'on en parle 15 minutes, sans engagement', 'on en parle 30 minutes, sans engagement')
where owner_id is null and grp = 'D' and step = '2' and variant = 'default';
