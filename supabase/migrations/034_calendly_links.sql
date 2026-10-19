-- ============================================================================
-- Bâtisseur — migration : un lien Calendly par groupe de messages (A à D)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- people.calendly_links = { "A": "https://…", "B": "…", "C": "…", "D": "…" }
-- Le CRM ajoute lui-même ?utm_source=linkedin&utm_campaign=<groupe> au moment de
-- rendre le message ; on stocke donc les liens nus. people.calendly_url (lien
-- unique) reste le lien de repli pour un groupe sans lien dédié.

alter table public.people
  add column if not exists calendly_links jsonb not null default '{}'::jsonb;

update public.people
set calendly_links = jsonb_build_object(
  'A', 'https://calendly.com/justiceforkuo-ovb/partenariat-proteger-vos-equipes',
  'B', 'https://calendly.com/justiceforkuo-ovb/bilan-financier-complet',
  'C', 'https://calendly.com/justiceforkuo-ovb/cafe-recommandations',
  'D', 'https://calendly.com/justiceforkuo-ovb/collaboration'
)
where email = 'justiceforkuo@preparedmindspro.com';
