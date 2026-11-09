-- ============================================================================
-- Bâtisseur — migration 062 : banque d'objections de l'équipe (modifiable par les administrateurs)
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Une objection = une information sur le client, pas un mur à abattre (« je protège avant de vendre »).
--   - libelle        : l'objection en peu de mots (« Pas le temps ») ;
--   - mots_clients   : les formulations réelles entendues, sans nom de personne ;
--   - reponse_equipe : la réponse de l'équipe, à dire avec ses propres mots ;
--   - validee        : seul un administrateur la passe à vrai ; tant qu'elle est fausse, la réponse reste un brouillon
--                      que seuls les administrateurs voient.
-- Lecture : tout le monde voit les objections validées ; les administrateurs voient et modifient tout.
-- Les réponses de départ viennent du module 6 « L'appel téléphonique » et sont toutes à valider.

create table if not exists public.objections (
  id uuid primary key default gen_random_uuid(),
  libelle text not null check (length(btrim(libelle)) > 0),
  mots_clients text[] not null default '{}',
  reponse_equipe text,
  validee boolean not null default false,
  ordre integer not null default 0,
  creee_par uuid references public.people (id) on delete set null,
  validee_par uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists objections_ordre_idx on public.objections (ordre);

alter table public.objections enable row level security;

drop policy if exists objections_select on public.objections;
create policy objections_select on public.objections for select to authenticated
  using (validee or public.is_admin());

drop policy if exists objections_admin_write on public.objections;
create policy objections_admin_write on public.objections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.objections to authenticated;

-- Objections de départ (une seule fois : seulement si la banque est vide). Réponses du module 6, à valider.
insert into public.objections (libelle, mots_clients, reponse_equipe, ordre)
select v.libelle, v.mots, v.reponse, v.ordre
from (values
  ('Pas le temps', array['Je n''ai pas le temps !'],
   'Justement, c''est pour ça que je t''appelle d''abord, car je sais que tu es occupé. Le but n''est pas de tout t''expliquer maintenant, mais de fixer un rendez-vous ensemble et de le mettre dans ton agenda à un moment où tu es disponible. Ça ne prendra que 30 minutes. Quel jour te conviendrait ?', 0),
  ('Déjà un conseiller', array['J''ai déjà un courtier qui me conseille', 'J''ai déjà tout à ma banque'],
   'C''est parfait : je pourrai ainsi faire des comparaisons, et cela m''aidera énormément pour ma formation. Je suppose que tu veux ce qu''il y a de mieux pour toi ? Quand est-ce que l''on peut se voir : jour X ou jour Y ?', 1),
  ('Envoie-moi un mail', array['Envoie-moi un mail'], null, 2),
  ('Pas d''argent', array['Je n''ai pas d''argent'], null, 3),
  ('Je dois en parler à mon conjoint', array['Je dois en parler à mon conjoint'],
   'Justement, ce sont des informations qui concernent le ménage : je préfère fixer un moment où il ou elle sera là. Quand penses-tu que cela peut se faire : jour X ou jour Y ?', 4),
  ('Déjà client chez OVB', array['Je suis déjà client(e) chez OVB en épargne pension'],
   'C''est génial, et ce serait vraiment intéressant que l''on se rencontre dans le cadre de ma formation, pour que j''aie ton avis sur nos services. Tu pourras par la même occasion me conseiller sur les points à améliorer.', 5),
  ('Pourquoi moi ?', array['Mais pourquoi moi ? Je ne m''y connais pas du tout'],
   'Justement, c''est idéal : tu es exactement le profil qu''il me faut. Le but est que je voie un maximum de profils différents pour approfondir ma formation. Quand es-tu disponible ?', 6),
  ('Tu veux me vendre quelque chose', array['Tu veux me vendre quelque chose, je ne suis pas intéressé.'], null, 7),
  ('Une formation en quoi ?', array['Je n''ai pas très bien compris. Tu suis une formation en quoi ?'], null, 8)
) as v(libelle, mots, reponse, ordre)
where not exists (select 1 from public.objections);
