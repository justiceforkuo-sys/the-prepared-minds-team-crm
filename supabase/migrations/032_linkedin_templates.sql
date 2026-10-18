-- ============================================================================
-- Bâtisseur — migration : Pipeline LinkedIn, phase B (messages personnalisables)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- linkedin_templates : modèles d'équipe (owner_id null, modifiables par l'admin)
--   et versions personnelles de chaque collaborateur.
-- linkedin_contact_events.template_id : quel modèle a servi à chaque envoi, pour
--   calculer le taux de réponse par version.
-- linkedin_template_stats() : envois / réponses par modèle (respecte la RLS).
-- linkedin_badges : badges du Défi (ici : « Plume d'or » quand une version est adoptée).
-- ============================================================================

create table if not exists public.linkedin_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.people (id) on delete cascade, -- null = modèle d'équipe
  grp text not null check (grp in ('A', 'B', 'C', 'D', 'ALL')),
  step text not null check (step in ('1', '2', '3', 'reply')),
  variant text not null default 'default',
  body text not null,
  updated_at timestamptz not null default now()
);

-- Un seul modèle par (propriétaire, groupe, étape, variante) ; owner_id null compte comme une valeur.
create unique index if not exists linkedin_templates_unique_idx
  on public.linkedin_templates (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), grp, step, variant);

drop trigger if exists linkedin_templates_touch_updated_at on public.linkedin_templates;
create trigger linkedin_templates_touch_updated_at
  before update on public.linkedin_templates
  for each row execute function public.touch_updated_at();

alter table public.linkedin_templates enable row level security;

-- Lecture : modèles d'équipe pour tous ; versions perso = propriétaire, sa hiérarchie et l'admin
create policy "linkedin_templates_read" on public.linkedin_templates
  for select using (
    owner_id is null
    or owner_id = current_person_id()
    or is_admin()
    or is_downline_of(owner_id, current_person_id())
  );

-- Écriture : ses propres versions
create policy "linkedin_templates_own_write" on public.linkedin_templates
  for all using (owner_id = current_person_id())
  with check (owner_id = current_person_id());

-- Écriture des modèles d'équipe : admin seulement
create policy "linkedin_templates_team_admin_write" on public.linkedin_templates
  for all using (owner_id is null and is_admin())
  with check (owner_id is null and is_admin());

grant select, insert, update, delete on public.linkedin_templates to authenticated;

alter table public.linkedin_contact_events
  add column if not exists template_id uuid references public.linkedin_templates (id) on delete set null;

create index if not exists linkedin_events_template_idx on public.linkedin_contact_events (template_id);

-- Envois et réponses par modèle, sur les événements visibles par l'appelant (RLS appliquée).
create or replace function public.linkedin_template_stats()
returns table (template_id uuid, sent bigint, replies bigint)
language sql
stable
as $$
  select
    e.template_id,
    count(*) filter (where e.action = 'Message envoyé'),
    count(*) filter (where e.action = 'A répondu')
  from public.linkedin_contact_events e
  where e.template_id is not null
  group by e.template_id
$$;

grant execute on function public.linkedin_template_stats() to authenticated;

create table if not exists public.linkedin_badges (
  user_id uuid not null references public.people (id) on delete cascade,
  badge text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge)
);

alter table public.linkedin_badges enable row level security;

create policy "linkedin_badges_read" on public.linkedin_badges
  for select using (
    user_id = current_person_id()
    or is_admin()
    or is_downline_of(user_id, current_person_id())
  );

create policy "linkedin_badges_admin_write" on public.linkedin_badges
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on public.linkedin_badges to authenticated;

-- ----------------------------------------------------------------------------
-- Modèles d'équipe (texte identique aux modèles du code)
-- ----------------------------------------------------------------------------
insert into public.linkedin_templates (owner_id, grp, step, variant, body) values
  (null, 'A', '1', 'default', $tpl$Bonjour {prenom},

Merci pour la connexion. J'accompagne des soignants, salariés et indépendants, sur leur protection sociale et leur pension, et je travaille déjà avec une structure infirmière en Wallonie.

Une question simple : chez {entreprise}, est-ce que vos équipes vous parlent de ces sujets (arrêt maladie, pension, statut complémentaire), ou c'est totalement absent du quotidien ?

Belle journée,
{prenom_collab}$tpl$),
  (null, 'A', '2', 'default', $tpl$Bonjour {prenom},

Je reviens vers vous avec une proposition concrète, au cas où elle puisse servir {entreprise} :

• Un atelier d'information d'une heure pour vos équipes : « Ce que je touche vraiment si je m'arrête, et comment préparer ma pension ». Gratuit, sans vente.
• Un bilan financier offert aux membres de l'équipe qui le souhaitent.
• Aucune charge pour vous : vous faites le lien, je m'occupe du reste.

Si ça vous parle, 15 minutes au téléphone suffisent pour voir si c'est pertinent.

{signature}$tpl$),
  (null, 'A', '3', 'default', $tpl$Bonjour {prenom},

Je ne veux pas encombrer votre messagerie, donc c'est mon dernier message. Si un jour la question de la protection de vos équipes se pose, je reste disponible. Et si ce n'est pas le moment, aucun souci.

Belle continuation,
{prenom_collab}$tpl$),
  (null, 'B', '1', 'default', $tpl$Bonjour {prenom},

Merci pour la connexion. Je travaille beaucoup avec des infirmiers et des aides-soignants, et une question revient souvent : « Si je m'arrête 3 mois, je touche combien ? » Très peu de gens connaissent la réponse.

Vous, vous la connaissez pour votre situation ?

Belle journée,
{prenom_collab}$tpl$),
  (null, 'B', '2', 'default', $tpl$Bonjour {prenom},

Je me permets de revenir vers vous. Si vous voulez y voir clair sur votre situation (arrêt de travail, pension, impôts), je propose un bilan gratuit de 30 minutes, sans engagement et sans rien à acheter.

Vous pouvez choisir un moment ici : {calendly}

{signature}$tpl$),
  (null, 'B', '3', 'default', $tpl$Bonjour {prenom},

Dernier petit message de ma part pour ne pas vous déranger. Si un jour vous avez une question sur votre protection ou votre pension, n'hésitez pas : je réponds toujours avec plaisir.

Belle continuation,
{prenom_collab}$tpl$),
  (null, 'C', '1', 'default', $tpl$Bonjour {prenom},

Merci pour la connexion. Je suis conseiller financier pour les indépendants et les professions de santé (OVB Willemot). Dans votre métier, vous croisez sûrement des clients qui ont besoin de structurer leur protection ou leur fiscalité. Et moi, je croise des clients qui ont besoin de vos services.

Ça vous dirait d'échanger 15 minutes pour voir si on peut se recommander mutuellement ?

{prenom_collab}$tpl$),
  (null, 'C', '2', 'default', $tpl$Bonjour {prenom},

Je reviens vers vous pour mon idée d'échange de recommandations. Concrètement : quand un de mes clients a besoin de quelqu'un comme vous chez {entreprise}, je pense à vous, et inversement. Aucun engagement, juste deux professionnels qui se font confiance.

Un café ou un appel de 15 minutes cette semaine ou la suivante ?

{signature}$tpl$),
  (null, 'C', '3', 'default', $tpl$Bonjour {prenom},

Dernier message pour ne pas insister. Si un jour un de vos clients a une question sur sa protection ou sa pension, je serai content de l'aider, et de vous renvoyer l'ascenseur.

Belle continuation,
{prenom_collab}$tpl$),
  (null, 'D', '1', 'default', $tpl$Salut {prenom},

Merci pour la connexion ! Je développe une équipe dans le conseil financier pour indépendants (Prepared Minds Team, sous OVB). Je cherche des personnes qui aiment le contact et qui veulent construire quelque chose sur le long terme.

Tu es ouvert(e) à de nouvelles perspectives en ce moment, ou tu es bien où tu es ?

{prenom_collab}$tpl$),
  (null, 'D', '2', 'default', $tpl$Salut {prenom},

Pour être clair sur ce que je propose : une formation complète, un accompagnement par l'équipe, et la possibilité de construire ton propre portefeuille de clients, à ton rythme pour commencer.

Si ça t'intrigue, on en parle 15 minutes, sans engagement : {calendly}

{prenom_collab}$tpl$),
  (null, 'D', '3', 'default', $tpl$Salut {prenom},

Dernier message, promis ! Si ce n'est pas pour toi, aucun souci, dis-le-moi simplement. Et si un jour tu as envie de changer d'air, ma porte reste ouverte.

Bonne continuation,
{prenom_collab}$tpl$),
  (null, 'ALL', 'reply', 'default', $tpl$Merci pour votre réponse, {prenom} !

[Rebondis sur ce qu'il ou elle t'a dit, en une ou deux phrases.]

Le plus simple serait d'en parler 15 minutes de vive voix. Vous pouvez choisir un moment ici : {calendly}

{prenom_collab}$tpl$)
on conflict do nothing;
