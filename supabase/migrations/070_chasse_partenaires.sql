-- ============================================================================
-- Bâtisseur — migration 070 : chasse aux structures partenaires
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================
-- Une ligne = une structure qui travaille avec des infirmiers / aides-soignants indépendants (bureau de tarification,
-- agence de placement, fédération…) que la personne veut transformer en partenaire. Chaque personne tient sa propre liste ;
-- elle est visible par sa hiérarchie (coach direct et au-dessus) et par les administrateurs. Les écritures passent par le
-- serveur (clé de service) : aucune politique d'écriture n'est nécessaire.
--
--   statut                : a_appeler → appele → rdv_fixe → rencontre → partenaire (ou sans_suite / ecarte)
--   confirmation_envoyee  : le mail de confirmation du rendez-vous (à envoyer dans l'heure) est parti
--   contact_*             : coordonnées PROFESSIONNELLES uniquement (jamais d'infirmier ni de client)
--
-- Pour Justice, la liste démarre avec les structures repérées le 17 novembre 2026 (sans numéro ni e-mail : à compléter).

create table if not exists public.partenaires_chasse (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people (id) on delete cascade,
  nom text not null check (length(btrim(nom)) > 0),
  type text not null default 'autre' check (type in ('tarification', 'placement', 'federation', 'demarrage', 'autre')),
  zone text,
  statut text not null default 'a_appeler' check (statut in ('a_appeler', 'appele', 'rdv_fixe', 'rencontre', 'partenaire', 'sans_suite', 'ecarte')),
  contact_nom text,
  contact_tel text,
  contact_email text,
  rdv_at timestamptz,
  rdv_format text check (rdv_format in ('visio', 'bureau')),
  rdv_lieu text,
  confirmation_envoyee boolean not null default false,
  dernier_appel date,
  nb_appels integer not null default 0 check (nb_appels >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partenaires_chasse_owner_idx on public.partenaires_chasse (owner_id, statut);

alter table public.partenaires_chasse enable row level security;

drop policy if exists partenaires_chasse_select on public.partenaires_chasse;
create policy partenaires_chasse_select on public.partenaires_chasse for select to authenticated
  using (
    owner_id = public.current_person_id()
    or public.is_downline_of(owner_id, public.current_person_id())
    or public.is_admin()
  );

grant select on public.partenaires_chasse to authenticated;

-- Liste de départ de Justice (une seule fois : seulement si sa liste est vide).
insert into public.partenaires_chasse (owner_id, nom, type, zone, statut, notes)
select p.id, v.nom, v.type, v.zone, v.statut, v.notes
from public.people p
cross join (values
  ('MonINFI', 'tarification', 'Liège', 'partenaire', 'Partenaire actuel : la référence à citer en ouverture d''appel.'),
  ('SSD Belgium', 'placement', 'Mons-lez-Liège', 'a_appeler', 'Priorité 1. Placement d''infirmiers et d''aides-soignants indépendants (MR, hôpitaux) ; le plus proche de MonINFI.'),
  ('SECSAD', 'tarification', 'Liège', 'a_appeler', 'Priorité 1. Bureau de tarification depuis 1998.'),
  ('FL-INFI', 'tarification', 'Richelle', 'a_appeler', 'Priorité 1. Bureau de tarification.'),
  ('BV Tarification', 'tarification', 'Montigny-le-Tilleul', 'a_appeler', 'Bureau de tarification.'),
  ('Infilux', 'tarification', 'La Louvière (toute la Belgique)', 'a_appeler', 'Bureau de tarification.'),
  ('Facturation InfiDomicile', 'tarification', 'Wallonie et Bruxelles', 'a_appeler', 'Bureau de tarification.'),
  ('Infi-Concept', 'demarrage', 'Nivelles, Anderlues', 'a_appeler', 'Tarification et aide au démarrage.'),
  ('AIIB', 'federation', 'Feluy', 'a_appeler', 'Fédération (environ 681 infirmiers, plus de 150 formations par an) : proposer une formation sur la protection.'),
  ('Infifacile', 'tarification', null, 'ecarte', 'Écarté : a déjà un partenaire assurance, donc concurrent.')
) as v(nom, type, zone, statut, notes)
where p.slug = 'justice'
  and not exists (select 1 from public.partenaires_chasse c where c.owner_id = p.id);
