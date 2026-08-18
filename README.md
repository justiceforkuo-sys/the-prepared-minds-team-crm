# Bâtisseur

CRM/outil de gestion pour Prepared Minds Team — Next.js (App Router, TypeScript) +
Tailwind CSS + Supabase (Postgres, Auth, RLS).

## Mise en route

### 1. Base de données Supabase

Dans le dashboard Supabase du projet → **SQL Editor** → New query, exécute **dans cet
ordre** :

1. `supabase/schema.sql` — crée toutes les tables, les policies RLS, et le trigger
   qui relie un compte à sa fiche `people` par email.
2. `supabase/seed.sql` — importe les données réelles (personnes, clients, polices,
   historique de paiements Willemot) depuis l'ancien artefact.

Pour régénérer `supabase/seed.sql` après avoir modifié les données source, édite
`scripts/generate-seed.mjs` puis relance :

```bash
node scripts/generate-seed.mjs
```

### 2. Variables d'environnement

`.env.local` contient déjà l'URL et la clé publique (anon) Supabase du projet. Ne
commite jamais ce fichier (il est dans `.gitignore`).

### 3. Créer les comptes de connexion

Le seed crée les fiches `people` (Justice, Nana, Samuel, Frank, et les anciens
collaborateurs) mais **aucun compte de connexion** — ceux-ci doivent être créés via
l'écran "Créer un compte" de l'app, avec l'email exact renseigné dans
`scripts/generate-seed.mjs` (`PEOPLE_SEED`). Un trigger Postgres relie
automatiquement le compte à la fiche existante dès l'inscription. Seul Justice a un
email pré-rempli (`justiceforkuo@preparedmindspro.com`) ; pour Nana/Samuel/Frank,
ajoute leur email dans la fiche (onglet Équipe, une fois connecté en tant que
Justice) avant qu'ils ne créent leur compte.

### 4. Lancer en local

```bash
npm install
npm run dev
```

### 5. Déployer

- **Vercel** : importe le repo, ajoute les mêmes variables d'environnement
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) dans les
  Project Settings, déploie.
- **Supabase** : déjà en place, tier gratuit.

## Architecture

- `src/app/(app)/` — écrans authentifiés (nav commune dans `layout.tsx`).
- `src/app/login/` — connexion/inscription email + mot de passe.
- `src/proxy.ts` — équivalent du `middleware.ts` classique (renommé `proxy` depuis
  Next.js 16) : rafraîchit la session Supabase et redirige les visiteurs non
  connectés vers `/login`.
- `src/utils/supabase/` — clients Supabase (navigateur, serveur, proxy).
- `src/lib/current-person.ts` — récupère la fiche `people` de l'utilisateur connecté.
- `supabase/schema.sql` / `supabase/seed.sql` — schéma et données réelles.

### Écrans fonctionnels (données réelles, CRUD complet)

Clients (book personnel + cascade en lecture seule sur les recrues directes),
Prospects (pipeline privé, priorités ABC, anti-doublon), Équipe (recrutement en
cascade, demandes de suppression avec validation admin).

### Écrans en version simplifiée (à enrichir dans une prochaine session)

Aujourd'hui, Tableau, Suivis, Revenus, Onboarding, Objectifs. Scripts est complet
(contenu statique). Le simulateur de commission, le calcul de revenu d'équipe, la
roue des 5 piliers et le diaporama de formation du spec d'origine restent à
implémenter.

## Note d'architecture : liaison compte ↔ fiche

Le spec d'origine prévoyait `people.id = auth.users.id`. En pratique, un sponsor
doit pouvoir enregistrer une nouvelle recrue avant qu'elle ait un compte. Le schéma
utilise donc `people.id` (uuid stable, généré à la création de la fiche) +
`people.auth_user_id` (rempli automatiquement par un trigger Postgres dès que la
personne s'inscrit avec l'email correspondant).
