-- ============================================================================
-- Bâtisseur — contenu initial du module "Formation continue" (6 modules +
-- QCM), transcrit depuis "Formation continue.pdf".
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

with m0 as (
  insert into training_modules (order_index, title, content) values (
    0,
    'Entretien DV1 & recommandation',
    $md$## Les 5 étapes du DV1

1. **Accueil** — mettre à l'aise, cadrer l'objectif de l'échange
2. **Découverte** — questions ouvertes sur la situation, les priorités, les préoccupations
3. **Priorités** — faire ressortir ce qui compte le plus pour la personne
4. **Reformulation** — synthétiser ce qui a été entendu, valider la compréhension
5. **Date suivante** — fixer le prochain rendez-vous (DV2), jamais de vente ici

## La règle du 70/30

Le collaborateur parle 30% du temps maximum, écoute 70%. Le DV1 sert à comprendre la personne, pas à la convaincre.

## "100% découverte" — la règle non négociable

Aucun produit, aucun montant, aucune simulation chiffrée ne doit être présenté en DV1. Le DV1 sert uniquement à qualifier et à donner envie d'un DV2 — jamais à vendre.

## Le script de recommandation

En fin d'entretien, demander systématiquement si la personne connaît 2-3 personnes de son entourage professionnel qui pourraient être dans une situation similaire — sans jamais forcer, en gardant le ton naturel de la conversation.

## Garde-fou

Le non-respect du "100% découverte" est la première cause de DV1 qui échouent à générer un DV2 — la vente prématurée met le prospect sur la défensive.

## Cas pratique — Christelle (DV1)

Au téléphone puis en DV1, Christelle avait déjà exposé ses difficultés (trésorerie confuse, missions non rémunérées, épargne enfants non organisée). Le DV1 a commencé par l'écouter et reformuler ce qu'elle avait déjà partagé — sans réagir avec une solution ni un chiffre — avant de fixer la date du DV2 où les mécanismes concrets ont été présentés.$md$
  )
  returning id
)
insert into training_questions (module_id, order_index, question, options, correct_option)
select id, 0, $q$Combien d'étapes compte la structure du DV1 ?$q$, $o$["3", "5", "7", "4"]$o$::jsonb, 1 from m0
union all
select id, 1, $q$Que signifie la règle du 70/30 ?$q$, $o$["Le collaborateur parle 70% du temps", "Le collaborateur écoute 70% du temps", "70% des DV1 doivent déboucher sur un DV2", "70% de questions fermées, 30% de questions ouvertes"]$o$::jsonb, 1 from m0
union all
select id, 2, $q$Peut-on présenter un produit ou un chiffre en DV1 ?$q$, $o$["Oui, si le prospect le demande", "Non, jamais — \"100% découverte\"", "Oui, uniquement des ordres de grandeur", "Oui en fin d'entretien"]$o$::jsonb, 1 from m0
union all
select id, 3, $q$Quel est l'objectif de la dernière étape du DV1 ?$q$, $o$["Signer un contrat", "Présenter une simulation", "Fixer la date du DV2", "Clore définitivement l'échange"]$o$::jsonb, 2 from m0
union all
select id, 4, $q$Quelle est la cause la plus fréquente d'échec d'un DV1 ?$q$, $o$["Trop de questions ouvertes", "Une vente ou une présentation prématurée", "Un rendez-vous trop court", "L'absence de script de recommandation"]$o$::jsonb, 1 from m0;

with m1 as (
  insert into training_modules (order_index, title, content) values (
    1,
    'Entretien recrutement',
    $md$## Les 6 étapes de l'entretien recrutement

1. **Société/partenaires** — positionner PMT et OVB Willemot (FSMA 0801.707.572)
2. **Mission** — pourquoi PMT existe, le marché visé
3. **Business model** — fonctionnement concret de l'activité au quotidien
4. **Formation** — parcours d'intégration et montée en compétence
5. **Plan de rémunération** — grille JFA I à CN, sur 3 leviers
6. **Formulaire** — passage à l'action

## Les 3 leviers de la grille JFA (I à CN)

- **Vente directe** : commission sur les contrats personnellement conclus
- **Générationnel** : commission sur les ventes de l'équipe recrutée
- **Récurrent** : commission sur le renouvellement/la fidélisation dans le temps

> Les taux exacts par échelon (I à CN) ne sont pas encore repris ici — à compléter à partir du document interne officiel avant mise en ligne, pour éviter toute erreur de chiffre.

## Garde-fou impératif

Ce contenu (déroulé complet + grille) est strictement interne. En prospection LinkedIn publique (M1/M2/M3 recrutement), interdiction absolue d'annoncer un chiffre, un pourcentage ou une promesse de gain — l'entretien complet n'a lieu qu'en rendez-vous formel.$md$
  )
  returning id
)
insert into training_questions (module_id, order_index, question, options, correct_option)
select id, 0, $q$Quelle est la première étape de l'entretien recrutement ?$q$, $o$["Formulaire", "Société/partenaires", "Plan de rémunération", "Formation"]$o$::jsonb, 1 from m1
union all
select id, 1, $q$Combien de leviers compte la grille de rémunération JFA ?$q$, $o$["2", "3 (vente directe, générationnel, récurrent)", "4", "5"]$o$::jsonb, 1 from m1
union all
select id, 2, $q$À quel moment de l'entretien aborde-t-on le plan de rémunération ?$q$, $o$["Avant la mission", "Juste avant le formulaire, après la formation", "On ne l'aborde jamais en découverte", "Seulement si le prospect insiste"]$o$::jsonb, 1 from m1
union all
select id, 3, $q$Peut-on annoncer un pourcentage de commission dans un message LinkedIn public ?$q$, $o$["Oui si le prospect est qualifié", "Non, jamais — interdiction absolue de promesse de gain chiffrée en public", "Oui, sous forme de fourchette", "Oui avec la mention \"à titre indicatif\""]$o$::jsonb, 1 from m1
union all
select id, 4, $q$Que couvre le levier "récurrent" ?$q$, $o$["Les ventes de l'équipe recrutée", "Les contrats personnellement conclus", "Le renouvellement/la fidélisation dans le temps", "Les bonus de formation"]$o$::jsonb, 2 from m1;

with m2 as (
  insert into training_modules (order_index, title, content) values (
    2,
    'Entretien d''analyse (DV2 / closing)',
    $md$## Le chiffre de référence

Officiellement, la pension moyenne en Belgique est de **1.200€/mois** (source : Service fédéral des pensions). C'est ce chiffre qu'on utilise partout dans nos discours — pas le 1.243€ qu'on peut trouver ailleurs en ligne.

## La chute est proportionnelle au statut

Un indépendant ou salarié voit son revenu chuter de **50 à 70%** à la pension. Un fonctionnaire, environ **30%** seulement (régime plus protecteur).

## Cas concret (médecin)

Revenu net de 4.000€/mois → pension estimée à 1.200€/mois. C'est ce cas qu'on utilise en DV2 pour rendre le trou de pension tangible.

## PLCI

Plafond de 8,17% des revenus professionnels nets, maximum absolu **4.086,34€** en 2026 (PLCI sociale : 4.701,54€, avec couvertures de solidarité en plus). Double avantage : la cotisation se déduit du revenu professionnel comme charge sociale, ce qui réduit à la fois l'impôt des personnes physiques ET les cotisations sociales dues — l'économie combinée est estimée entre 1.700€ et 2.000€/an sur le plafond maximum, à affiner selon les revenus réels.

## Épargne-pension classique

Plafond de base à 1.050€/an, avec une réduction d'impôt de 30% (soit 315€ d'économie), ou plafond supérieur à 1.350€/an avec une réduction ramenée à environ 25%. Un levier simple à activer en complément de la PLCI.

## Contrat INAMI

Allocation 2025 fixée à **6.078€** — un levier de financement propre au secteur médical à connaître.

## Calcul de l'épargne long terme (outil PMT)

Plafond légal 2.450€/an, réduction d'impôt de 30% (jusqu'à 735€/an d'économie). Formule outil PMT : **6% du revenu net imposable + 183,60€**, plafonnée à ce montant — c'est ce calcul qui alimente le calculateur Excel.

## Épargne pour les enfants

Sujet secondaire à explorer en fin d'entretien DV2 quand le client a des enfants sans épargne organisée — ne doit jamais devenir l'argument de vente central, mais mérite d'être mentionné.

## Cas pratique — Christelle (infirmière indépendante)

Christelle exerce seule depuis un déménagement, avec une gestion financière confuse, des missions confiées à des collègues sans rémunération, et une épargne enfants non organisée. Le DV2 a suivi l'ordre du playbook : volet fiscal immédiat (épargne-pension, épargne à long terme, PLCI) pour un bénéfice concret dès cette année, puis protection du revenu (rente incapacité de travail, franchise courte vu sa trésorerie limitée) en lien direct avec la nature physique de son métier, puis sujets complémentaires (obsèques, épargne enfants) en fin d'entretien.

## Garde-fou

Ce deck sert au closing DV2, en tête-à-tête avec un client identifié. Ces chiffres ne sortent jamais tels quels dans un post public ou un DM — la ligne conseil personnalisé / pédagogie publique reste non négociable.$md$
  )
  returning id
)
insert into training_questions (module_id, order_index, question, options, correct_option)
select id, 0, $q$Quelle est la pension moyenne officielle utilisée par PMT ?$q$, $o$["1.243€/mois", "1.200€/mois", "1.500€/mois", "950€/mois"]$o$::jsonb, 1 from m2
union all
select id, 1, $q$Pour un revenu de 4.000€/mois, quelle pension est utilisée dans le cas type PMT ?$q$, $o$["2.800€/mois", "2.000€/mois", "1.200€/mois", "1.600€/mois"]$o$::jsonb, 2 from m2
union all
select id, 2, $q$Quel est le plafond absolu de cotisation PLCI (personne physique) en 2026 ?$q$, $o$["2.450€", "4.086,34€", "4.701,54€", "6.078€"]$o$::jsonb, 1 from m2
union all
select id, 3, $q$Quel est le montant de l'allocation INAMI 2025 ?$q$, $o$["4.078€", "5.500€", "6.078€", "7.200€"]$o$::jsonb, 2 from m2
union all
select id, 4, $q$Comment se calcule l'épargne à long terme dans l'outil PMT, et quel est son plafond légal ?$q$, $o$["10% du revenu brut, plafond 2.000€", "6% du revenu net imposable + 183,60€, plafonné à 2.450€", "Montant fixe de 2.000€/an", "15% du chiffre d'affaires, plafond 2.530€"]$o$::jsonb, 1 from m2;

with m3 as (
  insert into training_modules (order_index, title, content) values (
    3,
    'Partenariats prescripteurs',
    $md$## Le profil prescripteur (rappel)

Directeur/responsable d'un établissement de soins, d'une clinique, d'un réseau associatif ou professionnel médical, secrétariat social (type MonINFI) — toute personne en contact régulier avec des indépendants du médical sans être elle-même indépendante.

## Cas pratique — Nancy Monard

Directrice de L'Air du Temps (maison de repos / résidence-services, groupe Korian) à Liège — salariée, sans signal de reconversion, donc écartée du recrutement ; pas indépendante, donc écartée du client (pas concernée par la PLCI ni la prévoyance liée au statut). Elle correspond exactement au profil Prescripteur / Apporteur réseau : en contact régulier avec des indépendants du médical sans l'être elle-même. Ce cas illustre l'angle mort du pipeline à ne pas rater : un profil qui n'est ni recrue ni client n'est pas forcément à écarter.

## Le modèle MonINFI — la référence

Partenariat formalisé par contrat d'un an, avec une commission de **15%** sur chaque client référé et concrétisé. C'est un mécanisme plus structuré qu'une simple mise en relation informelle : il engage les deux parties dans la durée et objective la valeur de chaque introduction.

## Deux options d'approche selon le contexte

1. **Message LinkedIn softer (M1/M2 prescripteur)** — explorer si des membres du réseau du prescripteur pourraient bénéficier d'un échange, sans mentionner de commission à ce stade
2. **Proposition de partenariat structuré type MonINFI** — réservée aux échanges déjà qualifiés, une fois l'intérêt confirmé

## Le pipeline dédié

Statut spécifique pour suivre ces contacts sans diluer les métriques de conversion client : Contacté → Répondu → Échange qualifié → Mise en relation obtenue → Nouveau lead client généré → Sans suite.

## Garde-fou impératif

On ne vend jamais au prescripteur lui-même sur sa propre situation financière — l'objectif est une mise en relation avec son réseau, jamais un dossier ouvert sur la personne elle-même. Une sollicitation directe et déplacée casse la relation et ferme la porte à de futures introductions.$md$
  )
  returning id
)
insert into training_questions (module_id, order_index, question, options, correct_option)
select id, 0, $q$Nancy Monard, directrice salariée d'une maison de repos, n'a ni signal de reconversion ni statut d'indépendante — dans quelle catégorie la classer ?$q$, $o$["Recrutement", "Client", "Prescripteur / apporteur réseau", "Aucune catégorie, on l'ignore"]$o$::jsonb, 2 from m3
union all
select id, 1, $q$Quelle commission prévoit le modèle MonINFI sur un client référé et concrétisé ?$q$, $o$["5%", "10%", "15%", "20%"]$o$::jsonb, 2 from m3
union all
select id, 2, $q$Sur quelle durée est formalisé le contrat de partenariat MonINFI ?$q$, $o$["6 mois", "1 an", "3 ans", "Durée indéterminée sans contrat"]$o$::jsonb, 1 from m3
union all
select id, 3, $q$Quel est l'objectif d'un échange avec un prescripteur ?$q$, $o$["Lui vendre directement une solution de prévoyance", "Obtenir une mise en relation avec son réseau", "Le recruter comme collaborateur JFA", "Lui faire signer un DV1"]$o$::jsonb, 1 from m3
union all
select id, 4, $q$Quelle est la dernière étape du pipeline prescripteur en cas d'échec ?$q$, $o$["Nouveau lead client généré", "Mise en relation obtenue", "Sans suite", "Échange qualifié"]$o$::jsonb, 2 from m3;

with m4 as (
  insert into training_modules (order_index, title, content) values (
    4,
    'Outils de gestion financière',
    $md$## L'outil 1 — Gestion Financière Indépendants

Un vrai tableau de bord de suivi client, pas un simulateur ponctuel :

- Revenus/charges mensuels détaillés → calcul du revenu net disponible
- Cotisations : INASTI 20,5%, IPP 32%, taxe communale 7% → net disponible automatique
- Suivi PLCI/CPTI : avantage fiscal + projection du capital pension (20 ans, 2%/an)
- Budget personnel mensuel, fonds d'urgence, objectifs d'épargne datés

**169 formules au total.** Un seul champ à remplir pour démarrer un nouveau client : l'onglet **Paramètres, cellule B5** (nom du client) — tout le reste se recalcule automatiquement à partir de là.

## L'outil 2 — en cours de correction

Un second calculateur existe, avec une erreur `#REF!` encore ouverte. Ne pas l'utiliser en DV2 tant que la correction n'est pas confirmée par Justice.

## Règle d'usage

Après toute modification d'une cellule, toujours relancer le recalcul. Un fichier édité à la main sans recalcul peut afficher des valeurs obsolètes ou incohérentes en rendez-vous — vérifier avant de présenter à un client.

## Dans quel entretien utiliser l'outil ?

Toujours en DV2, jamais en DV1 (voir Module 0 — "100% découverte"). L'outil objective et personnalise la conversation une fois que la découverte a eu lieu.$md$
  )
  returning id
)
insert into training_questions (module_id, order_index, question, options, correct_option)
select id, 0, $q$Que calcule l'Outil 1 à partir des revenus et charges mensuels ?$q$, $o$["Le chiffre d'affaires brut", "Le revenu net disponible", "Le montant de la commission JFA", "Le score de qualification du prospect"]$o$::jsonb, 1 from m4
union all
select id, 1, $q$Quel est le taux de cotisation INASTI utilisé dans l'outil ?$q$, $o$["13,07%", "20,5%", "32%", "7%"]$o$::jsonb, 1 from m4
union all
select id, 2, $q$Quel est le seul champ à remplir pour démarrer un nouveau client dans le modèle anonymisé ?$q$, $o$["Une nouvelle feuille complète à créer", "Paramètres!B5", "Le montant du PLCI", "La date de naissance uniquement"]$o$::jsonb, 1 from m4
union all
select id, 3, $q$Peut-on utiliser le fichier avec l'erreur #REF! en rendez-vous client ?$q$, $o$["Oui, l'erreur n'affecte pas les résultats", "Non, pas tant que la correction n'est pas confirmée", "Oui, uniquement pour les cas simples", "Oui, si on l'explique au client"]$o$::jsonb, 1 from m4
union all
select id, 4, $q$À quel moment de l'entretien utilise-t-on ces outils ?$q$, $o$["En DV1, dès l'accueil", "En DV2 uniquement", "Avant même le premier contact", "Peu importe le moment"]$o$::jsonb, 1 from m4;

with m5 as (
  insert into training_modules (order_index, title, content) values (
    5,
    'Protection du revenu (incapacité de travail)',
    $md$## La rente en cas d'incapacité de travail

Recommandée plutôt qu'une garantie perte de revenu classique pour les métiers physiquement exigeants (infirmiers, kinés) : le risque n'est pas seulement la perte de revenu, c'est l'incapacité à exécuter les gestes techniques du métier en cas de blessure ou de maladie.

## Le calibrage de la franchise

Prévoir une franchise courte (**15 à 30 jours**) pour un déclenchement rapide — surtout quand la trésorerie du client est limitée. Le bon calibrage, c'est l'équilibre entre cette franchise et le coût de la prime mensuelle : plus la franchise est courte, plus la prime est élevée.

## Point capital — l'exonération de primes

Désormais, PMT incite systématiquement ses clients à mettre en place une protection avec exonération de primes (incapacité de travail et/ou perte d'emploi). Le principe : en cas de sinistre couvert, c'est la compagnie d'assurance qui prend en charge le paiement des primes du contrat à la place du client — la couverture continue donc sans interruption, malgré la perte de revenu. C'est un argument central à mettre en avant systématiquement en DV2.

## Assurance obsèques

À proposer en complément de la rente incapacité, pour couvrir les frais liés au décès — un sujet simple à introduire une fois les protections principales du revenu posées.

## Épargne pour les enfants

Sujet secondaire à explorer en fin d'entretien DV2 quand le client a des enfants sans épargne organisée — ne doit jamais devenir l'argument de vente central, mais mérite d'être mentionné.

## Garde-fou

Ces protections se présentent en DV2, en fonction de la situation réelle du client (métier, trésorerie, charge de famille) — jamais un chiffre de prime annoncé publiquement, et l'exonération de primes reste un argument à personnaliser, pas une formule à réciter mécaniquement.$md$
  )
  returning id
)
insert into training_questions (module_id, order_index, question, options, correct_option)
select id, 0, $q$Pourquoi recommande-t-on une rente en cas d'incapacité de travail plutôt qu'une garantie perte de revenu classique pour un métier physique ?$q$, $o$["C'est moins cher", "Le risque principal est de ne plus pouvoir exécuter les gestes techniques du métier", "C'est obligatoire légalement", "Il n'y a pas de différence"]$o$::jsonb, 1 from m5
union all
select id, 1, $q$Quelle franchise recommande-t-on généralement pour la rente incapacité de travail ?$q$, $o$["3 à 6 mois", "15 à 30 jours", "1 an", "Aucune franchise"]$o$::jsonb, 1 from m5
union all
select id, 2, $q$Que se passe-t-il avec une protection à exonération de primes en cas de sinistre couvert ?$q$, $o$["Le client continue de payer normalement", "Le contrat est suspendu", "La compagnie d'assurance prend en charge le paiement des primes", "Le client doit rembourser plus tard"]$o$::jsonb, 2 from m5
union all
select id, 3, $q$Quel rôle joue l'assurance obsèques dans l'entretien ?$q$, $o$["C'est l'argument de vente central", "Un complément pour couvrir les frais en cas de décès", "Elle remplace la rente incapacité", "Elle n'a pas sa place en DV2"]$o$::jsonb, 1 from m5
union all
select id, 4, $q$Comment doit-on présenter l'épargne pour les enfants en DV2 ?$q$, $o$["Comme l'argument principal", "Comme un sujet secondaire à examiner en fin d'entretien", "On ne doit jamais en parler", "Uniquement si le client insiste"]$o$::jsonb, 1 from m5;
