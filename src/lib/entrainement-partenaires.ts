// Entraînement aux appels « structures partenaires » : bureaux de tarification, agences de placement, fédérations de
// soignants indépendants. Contenu repris de la séance d'entraînement du 17 novembre 2026 (fil rouge de l'appel, 7 profils
// d'interlocuteurs, phrases clés). Les interlocuteurs sont fictifs : aucun vrai nom de structure ni de personne, aucun numéro.
// Les séances terminées sont enregistrées dans la même table que les autres entraînements
// (entrainement_seances, scenario_id préfixé « part- »).

import type { Critere, Scenario } from "@/lib/entrainement";

export const PREFIXE_PARTENAIRE = "part-";

/** Première réplique de l'interlocuteur (jouée côté navigateur). */
export const OUVERTURE_PARTENAIRE = "Bonjour, j'écoute.";

export const SCENARIOS_PARTENAIRE: Scenario[] = [
  {
    id: "part-curieuse",
    titre: "La curieuse",
    niveau: "facile",
    defi: "« Vous vendez quoi exactement ? » puis « Envoyez-moi un mail » : ne lâche pas le rendez-vous.",
    situation:
      "Tu diriges un petit bureau de tarification pour infirmiers indépendants. Tu es aimable et curieuse. Tu demandes d'abord « Vous vendez quoi exactement ? », puis tu proposes « Envoyez-moi un mail ». Si la question sur les arrêts maladie te touche, tu racontes une histoire vraie et anonyme d'une infirmière en arrêt trois mois qui n'a presque rien reçu de la mutuelle. Tu acceptes un rendez-vous si le conseiller reste calme, rebondit sur ton histoire et propose deux créneaux précis.",
  },
  {
    id: "part-debordee",
    titre: "Le débordé",
    niveau: "normal",
    defi: "« Rappelez-moi la semaine prochaine » : obtiens tes deux minutes maintenant.",
    situation:
      "Tu diriges une agence qui place des infirmiers et des aides-soignants indépendants. Tu es sympathique mais débordé. Tu dis d'abord « Rappelez-moi la semaine prochaine », puis « Leur assurance, c'est leur affaire ». Tu évoques une aide-soignante partie chez un concurrent. Tu demandes « Ça me coûte combien ? » puis « Gratuit, il y a un piège ? ». Tu acceptes si le conseiller obtient ses deux minutes, parle de « vos soignants » (pas de « votre client »), explique que le bilan est gratuit et que, si la personne décide de mettre une solution en place, c'est la compagnie qui le rémunère, et propose deux créneaux.",
  },
  {
    id: "part-questions",
    titre: "La questionneuse",
    niveau: "normal",
    defi: "Elle pose beaucoup de questions et refuse de donner des coordonnées : l'accord des soignants d'abord.",
    situation:
      "Tu diriges un bureau de tarification. Tu poses beaucoup de questions, une par une : « Vous faites quoi avec le bureau dont vous parlez ? », « Ils ont déjà fait le bilan ? », puis « Je ne peux pas vous donner leurs coordonnées ». Tu acceptes si le conseiller répond directement, explique que ce sont les soignants qui donnent leur accord d'abord (rien n'est transmis sans eux), donne un résultat concret sans nom, et propose deux créneaux.",
  },
  {
    id: "part-directe",
    titre: "Le direct et pressé",
    niveau: "normal",
    defi: "« Liège, c'est loin », « Vous êtes seul ? » : réponds net, propose tout d'un coup.",
    situation:
      "Tu diriges un bureau de tarification, tu es direct et pressé. Tu dis « Liège, c'est loin », puis « Vous êtes seul ? », puis « Je ne veux pas qu'ils aient l'impression que je les vends ». Tu acceptes si le conseiller répond court, rassure sur le fait que ce sont les infirmiers qui choisissent, parle d'une équipe de sept personnes à temps plein, demande ton nom de famille et propose en une phrase : jour X ou jour Y, en visio ou au bureau.",
  },
  {
    id: "part-deja-aide",
    titre: "« On les aide déjà »",
    niveau: "normal",
    defi: "Elle aide déjà ses infirmiers à démarrer et ne donnera pas de liste : place le mot « accord ».",
    situation:
      "Tu diriges une structure qui aide les infirmiers à démarrer comme indépendants. Tu dis « On aide déjà nos infirmiers à démarrer », puis « Je ne vais pas vous donner la liste ». Tu acceptes si le conseiller formule l'argument à l'endroit (« Un infirmier malade ne facture plus rien, donc vous non plus », et non « plus de travail pour vous »), dit que les infirmiers donnent leur accord d'abord et que rien n'est transmis sans eux, propose deux créneaux précis et corrige le jour s'il se trompe.",
  },
  {
    id: "part-mefiante",
    titre: "La méfiante pressée",
    niveau: "difficile",
    defi: "« Vous êtes courtier ? », « On a déjà un courtier », « Vous touchez combien ? » : sois honnête et net.",
    situation:
      "Tu diriges un bureau de tarification. Tu es méfiante et pressée. Tu demandes d'emblée « Vous êtes courtier ? », puis « On travaille déjà avec un courtier », puis « Vous touchez combien ? ». Tu ne cèdes que si le conseiller répond franchement à chaque question (son statut, sous quelle société il travaille), te demande si tous tes infirmiers sont passés chez ce courtier (en réalité seulement une dizaine sur une quarantaine), dit qu'un deuxième avis ne coûte rien et que c'est toi qui offres ce service, est honnête sur la rémunération, répète le rendez-vous avec le lieu ou l'adresse e-mail.",
  },
  {
    id: "part-echaudee",
    titre: "L'échaudée",
    niveau: "difficile",
    defi: "Un assureur a déjà vendu des contrats inutiles à ses infirmiers : retourne la méfiance.",
    situation:
      "Tu diriges un bureau de tarification et tu es méfiant après une mauvaise expérience : un assureur a vendu à tes infirmiers des contrats inutiles. Tu demandes « Qu'est-ce qui me garantit que vous ne ferez pas pareil ? ». Tu ne cèdes que si le conseiller assume la méfiance, dit qu'il protège avant de vendre et que, si l'infirmier n'a besoin de rien, il le lui dit, propose de commencer par deux ou trois infirmiers pour que tu juges sur pièce, et reste honnête sur son statut (sans promesse en l'air). Tu ne te laisses pas impressionner par un jargon réglementaire. Tu acceptes alors un rendez-vous en visio.",
  },
];

/** Fil rouge et argumentation, donnés à l'interlocuteur et à l'évaluation. */
export const METHODE_PARTENAIRE = `Fil rouge de l'appel à une structure partenaire (bureau de tarification, agence de placement, fédération de soignants indépendants) :
1. Ouverture : se présenter (prénom, nom, équipe), dire qu'on travaille avec des infirmiers et aides-soignants indépendants (citer un partenaire existant comme référence si c'est vrai), demander si on parle bien au responsable, demander deux minutes.
2. La raison : « Vous connaissez vos infirmiers mieux que personne : vous voyez leurs revenus chaque mois. Presque aucun ne sait ce qu'il toucherait s'il tombait malade demain. Un infirmier malade ne facture plus rien, donc vous non plus. »
3. La question : « Est-ce que certains de vos infirmiers vous ont déjà parlé d'un arrêt maladie, d'une blessure ou de leur pension ? », puis se taire et laisser l'autre répondre.
4. La proposition : un bilan de protection offert aux infirmiers, sans engagement (revenu en cas d'arrêt, pension, déductions fiscales), rien dans leur dos, un service qui fidélise sans travail pour la structure.
5. Le rendez-vous : environ 20 minutes, deux créneaux précis (« mardi 15h ou jeudi 10h ? »), en visio ou au bureau.
6. Les objections : une objection est une information, pas un mur ; répondre court, avec ses mots, puis revenir au rendez-vous.
7. La clôture : répéter jour, heure, lieu ou e-mail, demander le nom de famille, annoncer un mail de confirmation dans l'heure.

Les 5 mots-clés : MonINFI (la référence) → malade → bilan → accord → mardi-jeudi.

Réponses attendues aux objections :
- « Vous vendez quoi exactement ? » : je ne vends rien par téléphone ; j'offre un bilan de protection aux infirmiers, vous connaissez vos infirmiers mieux que personne. Puis rebondir sur l'histoire racontée.
- « Envoyez-moi un mail » : avec plaisir, juste après qu'on se soit parlé 20 minutes ; mardi ou jeudi ?
- « Rappelez-moi la semaine prochaine » : deux minutes maintenant suffisent pour voir si ça vous intéresse.
- « Vous êtes courtier ? » : je suis conseiller financier, sous OVB Willemot ; je ne vous appelle pas pour vous vendre une assurance mais parce que vous connaissez vos infirmiers mieux que personne.
- « On travaille déjà avec un courtier » : très bien ; tous vos infirmiers sont-ils passés chez lui ? Un deuxième avis ne coûte rien, et c'est vous qui leur offrez ce service.
- Des soignants partent à la concurrence : justement, ce bilan est un avantage que votre concurrent n'offre pas ; ça aide à garder vos soignants.
- « Ça me coûte combien ? / Gratuit ? Vous gagnez votre vie comment ? » : le bilan est gratuit ; si la personne décide de mettre une solution en place, c'est la compagnie qui me rémunère. (Ne jamais dire « les clients ne me paient rien » : la commission est incluse dans les primes. Pas de blague du type « je peux vous facturer ».)
- « Je ne peux pas vous donner leurs coordonnées » : bien sûr ; ce sont vos infirmiers qui donnent leur accord d'abord, vous ne me transmettez rien sans eux.
- « Vous faites quoi avec [partenaire] ? » : il m'envoie ses soignants qui le souhaitent, et je leur fais un bilan de protection. Donner un résultat concret sans nom (« un infirmier vient de mettre en place sa pension et sa protection décès »).
- « Vous êtes seul ? » : j'ai une équipe de sept personnes, et je suis à temps plein.
- « Je ne veux pas qu'ils aient l'impression que je les vends » : ce sont les infirmiers qui choisissent ; vous ne les engagez à rien.
- « Un assureur nous a déjà déçus » : je comprends ; ma règle, c'est de protéger avant de vendre ; si l'infirmier n'a besoin de rien, je le lui dis ; commençons par deux ou trois infirmiers et vous jugerez sur pièce.
- « Qu'est-ce qui me garantit… ? » : parler du statut réel (sous OVB Willemot, société agréée FSMA ; ne dire « je suis agréé » que si c'est vrai pour soi) et de l'obligation d'agir dans l'intérêt du client ; ne pas se cacher derrière un jargon réglementaire : la vraie force, ce sont les valeurs.

Points de vigilance :
- Dire « vos soignants » ou « vos infirmiers », jamais « votre client ».
- Dire « Un infirmier malade ne facture plus rien, donc vous non plus » ; éviter « plus de travail pour vous », qui s'entend à l'envers à l'oral.
- Ne jamais promettre de commission, de rétrocession ou d'avantage à la structure (à faire valider par la conformité d'OVB Willemot avant d'en parler).
- Placer le mot « accord » : aucune coordonnée n'est transmise sans l'accord de l'infirmier.
- Ne pas lire un texte : parler avec ses mots à partir des 5 mots-clés.`;

export const CRITERES_PARTENAIRE: Critere[] = [
  { id: "ouverture", label: "Ouverture : présentation, référence, « deux minutes ? »" },
  { id: "raison", label: "La raison : un infirmier malade ne facture plus rien" },
  { id: "question", label: "La question sur les arrêts maladie, puis le silence" },
  { id: "proposition", label: "Proposition : bilan offert, sans engagement, service qui fidélise" },
  { id: "accord", label: "L'accord des soignants d'abord (rien transmis sans eux)" },
  { id: "transparence", label: "Transparence sur le statut et la rémunération" },
  { id: "rdv", label: "Rendez-vous : deux créneaux précis, visio ou bureau" },
  { id: "cloture", label: "Clôture : jour, heure, lieu ou e-mail, nom de famille, confirmation" },
  { id: "objection", label: "Réponse aux objections (court, avec ses mots)" },
];

// --- Page d'aide « Appels aux structures partenaires » ------------------------------------------------------------

export const MOTS_CLES = ["MonINFI", "malade", "bilan", "accord", "mardi-jeudi"] as const;

export const FIL_ROUGE: { etape: string; titre: string; texte: string }[] = [
  {
    etape: "1",
    titre: "Ouverture",
    texte:
      "« Bonjour, [prénom nom], de Prepared Minds Team. Je travaille avec des infirmiers et aides-soignants indépendants, notamment avec MonINFI à Liège. Est-ce que je parle bien au responsable du bureau ? Vous avez deux minutes ? »",
  },
  {
    etape: "2",
    titre: "La raison",
    texte:
      "« Vous connaissez vos infirmiers mieux que personne : vous voyez leurs revenus chaque mois. Presque aucun ne sait ce qu'il toucherait s'il tombait malade demain. Un infirmier malade ne facture plus rien, donc vous non plus. »",
  },
  {
    etape: "3",
    titre: "La question",
    texte: "« Est-ce que certains de vos infirmiers vous ont déjà parlé d'un arrêt maladie, d'une blessure ou de leur pension ? » Puis tu te tais.",
  },
  {
    etape: "4",
    titre: "La proposition",
    texte:
      "« Un bilan de protection offert à vos infirmiers, sans engagement : revenu en cas d'arrêt, pension, déductions fiscales. Rien dans votre dos. Pour vous, un service qui fidélise, sans aucun travail de votre côté. »",
  },
  {
    etape: "5",
    titre: "Le rendez-vous",
    texte: "« On en parle 20 minutes : mardi 15h ou jeudi 10h ? En visio ou à votre bureau ? »",
  },
  {
    etape: "6-7",
    titre: "Objections et clôture",
    texte: "Voir le tableau ci-dessous. Toujours répéter jour, heure, lieu ou e-mail, demander le nom de famille, puis envoyer le mail de confirmation dans l'heure.",
  },
];

export interface PhraseCle {
  situation: string;
  phrase: string;
  /** Phrase sensible : à faire relire par la conformité (OVB Willemot) avant de la diffuser largement. */
  conformite?: boolean;
}

export const PHRASES_CLES: PhraseCle[] = [
  {
    situation: "« Vous êtes courtier ? »",
    phrase:
      "« Je suis conseiller financier, sous OVB Willemot. Mais je ne vous appelle pas pour vous vendre une assurance. Je vous appelle parce que vous connaissez vos infirmiers mieux que personne. »",
    conformite: true,
  },
  { situation: "Ils racontent une histoire (un arrêt, un départ)", phrase: "« C'est exactement pour des cas comme celui-là que je vous appelle. »" },
  {
    situation: "« On travaille déjà avec un courtier. »",
    phrase: "« Très bien. Et tous vos infirmiers sont passés chez lui ? » puis « Un deuxième avis ne coûte rien, et c'est vous qui leur offrez ce service. »",
  },
  { situation: "Des soignants partent à la concurrence", phrase: "« Justement, ce bilan, c'est un avantage que votre concurrent n'offre pas. Ça aide à garder vos soignants. »" },
  {
    situation: "« Gratuit ? Vous gagnez votre vie comment ? »",
    phrase: "« Le bilan est gratuit. Si la personne décide de mettre une solution en place, c'est la compagnie qui me rémunère. »",
    conformite: true,
  },
  { situation: "« Je ne peux pas vous donner leurs coordonnées. »", phrase: "« Bien sûr. Ce sont vos infirmiers qui donnent leur accord d'abord, vous ne me transmettez rien sans eux. »" },
  { situation: "« Vous faites quoi avec MonINFI ? »", phrase: "« MonINFI m'envoie ses soignants qui le souhaitent, et je leur fais un bilan de protection. »" },
  { situation: "« Vous êtes seul ? »", phrase: "« J'ai une équipe de sept personnes, et je suis à temps plein. »" },
  {
    situation: "« Un assureur nous a déjà déçus. »",
    phrase: "« Je comprends. Ma règle, c'est de protéger avant de vendre. Si l'infirmier n'a besoin de rien, je le lui dis. Commençons par deux ou trois infirmiers, et vous jugerez sur pièce. »",
  },
  {
    situation: "« Qu'est-ce qui me garantit… ? »",
    phrase: "« Je travaille sous OVB Willemot, société agréée par la FSMA, et je dois agir dans l'intérêt du client. » (Dis « je suis agréé » seulement si tu l'es toi-même.)",
    conformite: true,
  },
  { situation: "« Rappelez-moi la semaine prochaine. »", phrase: "« Deux minutes maintenant suffisent pour voir si ça vous intéresse. »" },
  { situation: "« Envoyez-moi un mail. »", phrase: "« Avec plaisir, juste après qu'on se soit parlé 20 minutes. Mardi ou jeudi ? »" },
  { situation: "La clôture", phrase: "« Donc jeudi 10h, en visio / à votre bureau [adresse]. Je vous envoie la confirmation sur [e-mail]. » Puis demander le nom de famille." },
];

/** À éviter à l'oral, d'après les 8 appels d'entraînement. */
export const A_EVITER: string[] = [
  "« Votre client » : dire « vos soignants » ou « vos infirmiers ».",
  "« Plus de travail pour vous » : à l'oral, ça s'entend à l'envers. Dire « un infirmier malade ne facture plus rien, donc vous non plus ».",
  "« Les clients ne me paient rien » : la commission est incluse dans les primes. Dire que le bilan est gratuit et que c'est la compagnie qui rémunère.",
  "La blague « si vous voulez, je peux vous facturer ».",
  "Se retrancher derrière la réglementation (MiFID concerne surtout les placements) : parler du statut réel et de l'intérêt du client.",
  "Promettre une commission ou un avantage à la structure, avant validation par la conformité d'OVB Willemot.",
];

// --- Suivi de la chasse aux partenaires --------------------------------------------------------------------------

export const STATUTS_CHASSE = [
  { id: "a_appeler", label: "À appeler", couleur: "#8a97ad" },
  { id: "appele", label: "Appelé", couleur: "#c99a3f" },
  { id: "rdv_fixe", label: "Rendez-vous fixé", couleur: "#2f6fb3" },
  { id: "rencontre", label: "Rencontré", couleur: "#7a5ab5" },
  { id: "partenaire", label: "Partenaire", couleur: "#1f8158" },
  { id: "sans_suite", label: "Sans suite", couleur: "#b3543a" },
  { id: "ecarte", label: "Écarté", couleur: "#5a6b85" },
] as const;

export type StatutChasse = (typeof STATUTS_CHASSE)[number]["id"];

export const TYPES_STRUCTURE = [
  { id: "tarification", label: "Bureau de tarification" },
  { id: "placement", label: "Agence de placement" },
  { id: "federation", label: "Fédération / association" },
  { id: "demarrage", label: "Aide au démarrage" },
  { id: "autre", label: "Autre" },
] as const;

export type TypeStructure = (typeof TYPES_STRUCTURE)[number]["id"];

export const FORMATS_RDV_CHASSE = [
  { id: "visio", label: "En visio" },
  { id: "bureau", label: "Au bureau" },
] as const;
