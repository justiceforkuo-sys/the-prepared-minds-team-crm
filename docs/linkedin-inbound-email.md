# LinkedIn → CRM : réception des emails « invitation acceptée » (bloc 7, voie 1)

Aucune extension, aucun scraping, aucune automatisation sur LinkedIn. Le collaborateur transfère lui-même, depuis sa
messagerie, les emails de LinkedIn vers une adresse de réception personnelle du CRM.

## Ce que fait le CRM

- Adresse personnelle : `linkedin+<nom>-<code>@inbox.preparedmindspro.com` (le code à 8 caractères est aléatoire).
- Point d'entrée : `POST https://<site>/api/inbound/linkedin?key=<clé>`. L'URL complète (avec la clé) est affichée dans
  Admin → « LinkedIn : emails invitation acceptée ». La clé est dérivée de la clé service, jamais stockée dans le dépôt.
- Formats acceptés : JSON `{ from, to, subject, text, html, date }`, événement Resend `email.received`, formulaire
  (Mailgun / SendGrid / Postmark).
- Objets reconnus : « … a accepté votre invitation », « … accepted your invitation », « … heeft uw uitnodiging
  geaccepteerd » (et variantes). Tout le reste est ignoré (et son contenu n'est pas conservé).
- Création : fiche du Pipeline, statut « À contacter », étiquette « Nouvelle relation », groupe A à F (mêmes règles que
  l'import), `connected_on` = date de l'email. Doublon : la fiche existante est seulement complétée (poste, entreprise).
- Email de confirmation de transfert Gmail : son code ou son lien est affiché au collaborateur dans le CRM.
- Journal : `linkedin_inbound_log` (créé / doublon / ignoré / erreur), visible par l'admin ; le contenu brut est supprimé
  après 30 jours (tâche pg_cron `linkedin-inbound-purge`).

## À mettre en place une fois (administrateur)

Le domaine `preparedmindspro.com` est géré chez Google (Cloud DNS) avec Google Workspace pour le courrier : on ne touche
pas à ses enregistrements MX. On crée un **sous-domaine dédié** `inbox.preparedmindspro.com`.

### Option recommandée : Resend (déjà utilisé pour les emails sortants)

1. Resend → Domains → ajouter `inbox.preparedmindspro.com`, activer la réception (« Receiving ») et copier les
   enregistrements MX et TXT demandés dans Google Cloud DNS.
2. Resend → Webhooks → ajouter un webhook sur l'événement `email.received`, URL = l'URL affichée dans Admin
   (avec `?key=…`).
3. Variable d'environnement Vercel : `RESEND_API_KEY` (déjà présente) sert à lire le corps de l'email reçu.
4. Test : envoyer un email d'objet « Test Dupont a accepté votre invitation » à l'adresse d'un collaborateur, avec un lien
   `https://www.linkedin.com/in/test-dupont` dans le corps. Une fiche doit apparaître, et une ligne dans le journal Admin.

### Alternative : tout autre service d'emails entrants

Postmark (Inbound), Mailgun (Routes) ou SendGrid (Inbound Parse) : MX du sous-domaine `inbox` vers le service, puis
webhook vers l'URL du CRM. Si le service impose son propre format, il suffit d'envoyer le JSON ci-dessus
(un petit relais suffit).

## Pour le collaborateur

Instructions affichées dans le CRM (Pipeline LinkedIn → « Recevoir automatiquement mes nouvelles relations ») : copier
l'adresse, l'ajouter comme adresse de transfert dans Gmail, puis créer un filtre
`from:(invitations@linkedin.com OR notifications-noreply@linkedin.com)` → « Transférer à » cette adresse.

## Limites connues

- Les formulations exactes des objets d'emails LinkedIn peuvent évoluer : les premiers vrais emails serviront à les
  confirmer. Un email non reconnu apparaît « Ignoré » dans le journal avec son objet.
- Le titre et l'entreprise ne sont lus que si l'email les indique ; l'import mensuel de `Connections.csv` complète
  les fiches.
