// Entraînement aux appels « partenaires » : comptables, maisons de repos, bureaux de tarification, courtiers en crédit, agents
// immobiliers, notaires, kinés, fédérations, secrétariats sociaux. Contenu repris de la séance d'entraînement du 17 novembre 2026
// et du document « Scripts partenaires » (voir scripts-partenaires.ts). Les interlocuteurs sont fictifs : aucun vrai nom de
// structure ni de personne, aucun numéro. Les séances terminées sont enregistrées dans la même table que les autres
// entraînements (entrainement_seances, scenario_id préfixé « part- »).

import type { Critere, Scenario } from "@/lib/entrainement";
import { FAMILLES_OBJECTIONS, SCRIPT_PAR_TYPE } from "@/lib/scripts-partenaires";

export const PREFIXE_PARTENAIRE = "part-";

/** Première réplique de l'interlocuteur (jouée côté navigateur). */
export const OUVERTURE_PARTENAIRE = "Bonjour, j'écoute.";

export interface ScenarioPartenaire extends Scenario {
  type: TypeStructure;
}

export const SCENARIOS_PARTENAIRE: ScenarioPartenaire[] = [
  // --- Tarification et soins ---------------------------------------------------------------------------------------
  {
    id: "part-curieuse",
    type: "tarification",
    titre: "La curieuse",
    niveau: "facile",
    defi: "« Vous vendez quoi exactement ? » puis « Envoyez-moi un mail » : ne lâche pas le rendez-vous.",
    situation:
      "Tu diriges un petit bureau de tarification pour infirmiers indépendants. Tu es aimable et curieuse. Tu demandes d'abord « Vous vendez quoi exactement ? », puis tu proposes « Envoyez-moi un mail ». Si la question sur les arrêts maladie te touche, tu racontes une histoire vraie et anonyme d'une infirmière en arrêt trois mois qui n'a presque rien reçu de la mutuelle. Tu acceptes un rendez-vous si le conseiller reste calme, rebondit sur ton histoire et propose deux créneaux précis.",
  },
  {
    id: "part-debordee",
    type: "tarification",
    titre: "Le débordé",
    niveau: "normal",
    defi: "« Rappelez-moi la semaine prochaine » : obtiens tes deux minutes maintenant.",
    situation:
      "Tu diriges une agence qui place des infirmiers et des aides-soignants indépendants. Tu es sympathique mais débordé. Tu dis d'abord « Rappelez-moi la semaine prochaine », puis « Leur assurance, c'est leur affaire ». Tu évoques une aide-soignante partie chez un concurrent. Tu demandes « Ça me coûte combien ? » puis « Gratuit, il y a un piège ? ». Tu acceptes si le conseiller obtient ses deux minutes, parle de « vos soignants » (pas de « votre client »), explique que le bilan est gratuit et que, si la personne décide de mettre une solution en place, c'est la compagnie qui le rémunère, et propose deux créneaux.",
  },
  {
    id: "part-questions",
    type: "tarification",
    titre: "La questionneuse",
    niveau: "normal",
    defi: "Elle pose beaucoup de questions et refuse de donner des coordonnées : l'accord des soignants d'abord.",
    situation:
      "Tu diriges un bureau de tarification. Tu poses beaucoup de questions, une par une : « Vous faites quoi avec le bureau dont vous parlez ? », « Ils ont déjà fait le bilan ? », puis « Je ne peux pas vous donner leurs coordonnées ». Tu acceptes si le conseiller répond directement, explique que ce sont les soignants qui donnent leur accord d'abord (rien n'est transmis sans eux), donne un résultat concret sans nom, et propose deux créneaux.",
  },
  {
    id: "part-directe",
    type: "tarification",
    titre: "Le direct et pressé",
    niveau: "normal",
    defi: "« Liège, c'est loin », « Vous êtes seul ? » : réponds net, propose tout d'un coup.",
    situation:
      "Tu diriges un bureau de tarification, tu es direct et pressé. Tu dis « Liège, c'est loin », puis « Vous êtes seul ? », puis « Je ne veux pas qu'ils aient l'impression que je les vends ». Tu acceptes si le conseiller répond court, rassure sur le fait que ce sont les infirmiers qui choisissent, dit la vérité sur sa situation (équipe, temps plein ou non), demande ton nom de famille et propose en une phrase : jour X ou jour Y, en visio ou au bureau.",
  },
  {
    id: "part-deja-aide",
    type: "tarification",
    titre: "« On les aide déjà »",
    niveau: "normal",
    defi: "Elle aide déjà ses infirmiers à démarrer et ne donnera pas de liste : place le mot « accord ».",
    situation:
      "Tu diriges une structure qui aide les infirmiers à démarrer comme indépendants. Tu dis « On aide déjà nos infirmiers à démarrer », puis « Je ne vais pas vous donner la liste ». Tu acceptes si le conseiller formule l'argument à l'endroit (« Un infirmier malade ne facture plus rien, donc vous non plus », et non « plus de travail pour vous »), dit que les infirmiers donnent leur accord d'abord et que rien n'est transmis sans eux, propose deux créneaux précis et corrige le jour s'il se trompe.",
  },
  {
    id: "part-mefiante",
    type: "tarification",
    titre: "La méfiante pressée",
    niveau: "difficile",
    defi: "« Vous êtes courtier ? », « On a déjà un courtier », « Vous touchez combien ? » : sois honnête et net.",
    situation:
      "Tu diriges un bureau de tarification. Tu es méfiante et pressée. Tu demandes d'emblée « Vous êtes courtier ? », puis « On travaille déjà avec un courtier », puis « Vous touchez combien ? ». Tu ne cèdes que si le conseiller répond franchement à chaque question (son statut, sous quelle société il travaille), te demande si tous tes infirmiers sont passés chez ce courtier (en réalité seulement une dizaine sur une quarantaine), dit qu'un deuxième avis ne coûte rien et que c'est toi qui offres ce service, est honnête sur la rémunération, répète le rendez-vous avec le lieu ou l'adresse e-mail.",
  },
  {
    id: "part-echaudee",
    type: "tarification",
    titre: "L'échaudée",
    niveau: "difficile",
    defi: "Un assureur a déjà vendu des contrats inutiles à ses infirmiers : retourne la méfiance.",
    situation:
      "Tu diriges un bureau de tarification et tu es méfiant après une mauvaise expérience : un assureur a vendu à tes infirmiers des contrats inutiles. Tu demandes « Qu'est-ce qui me garantit que vous ne ferez pas pareil ? ». Tu ne cèdes que si le conseiller assume la méfiance, dit qu'il protège avant de vendre et que, si l'infirmier n'a besoin de rien, il le lui dit, propose de commencer par deux ou trois infirmiers pour que tu juges sur pièce, et reste honnête sur son statut (sans promesse en l'air). Tu ne te laisses pas impressionner par un jargon réglementaire. Tu acceptes alors un rendez-vous en visio.",
  },
  // --- Comptables --------------------------------------------------------------------------------------------------
  {
    id: "part-compta-conseil",
    type: "comptable",
    titre: "« On fait déjà le conseil fiscal »",
    niveau: "normal",
    defi: "Il craint qu'on marche sur son métier : montre la complémentarité.",
    situation:
      "Tu diriges un cabinet comptable. Tu dis « On fait déjà le conseil fiscal », puis « Nos clients ont déjà leur banque ». Tu acceptes si le conseiller dit qu'il ne touche pas à ton métier (tu calcules l'impôt, lui met en place les contrats), que le bilan vérifie si tes clients sont vraiment couverts (souvent il y a des trous sur l'incapacité), que tu reçois un compte rendu si le client le souhaite et que rien ne se fait dans ton dos, puis propose deux créneaux.",
  },
  {
    id: "part-compta-resp",
    type: "comptable",
    titre: "« Je n'engage pas ma responsabilité »",
    niveau: "difficile",
    defi: "Il redoute pour sa responsabilité et demande ce qu'on lui reverse : reste transparent sans rien promettre.",
    situation:
      "Tu diriges une fiduciaire et tu es prudent sur la déontologie. Tu dis « Je ne veux pas engager ma responsabilité », puis « Vous me reversez quoi ? ». Tu acceptes si le conseiller explique que tu n'engages rien (tu transmets son contact, le client décide seul), dit sous quelle société il travaille sans se vanter d'un statut qu'il n'aurait pas, répond sur la rémunération en renvoyant la discussion au rendez-vous, en toute transparence, SANS annoncer de montant ni promettre d'avantage. S'il promet une commission, tu t'étonnes et tu mets un frein.",
  },
  // --- Maisons de repos --------------------------------------------------------------------------------------------
  {
    id: "part-mr-demarchage",
    type: "maison_repos",
    titre: "« Pas de démarchage chez nous »",
    niveau: "normal",
    defi: "Le directeur refuse tout démarchage et craint de perdre du temps de son personnel.",
    situation:
      "Tu diriges une maison de repos. Tu dis « Je ne veux pas de démarchage dans ma maison », puis « Mon personnel n'a pas le temps ». Tu acceptes si le conseiller parle d'information et non de vente, dit qu'il ne contacte que ceux qui le demandent, précise que l'atelier de 45 minutes se cale sur un changement d'équipe ou une pause et que les bilans se font hors des heures de travail, que cela ne coûte rien et que les résidents ne sont pas concernés, puis propose deux créneaux.",
  },
  {
    id: "part-mr-siege",
    type: "maison_repos",
    titre: "« Il faut passer par le siège »",
    niveau: "difficile",
    defi: "Il n'est pas décideur et a déjà une assurance groupe : obtiens le bon contact.",
    situation:
      "Tu diriges une maison de repos qui fait partie d'un groupe. Tu dis « On a déjà une assurance groupe », puis « Il faut passer par le groupe, par le siège ». Tu acceptes un petit rendez-vous si le conseiller explique que l'atelier aide ton personnel à comprendre ce que l'assurance groupe couvre et ne couvre pas, demande qui contacter au siège et s'il peut dire qu'il vient de ta part, et propose deux créneaux. Tu ne donnes pas de nom au siège avant qu'il te l'ait demandé poliment.",
  },
  // --- Courtiers en crédit -----------------------------------------------------------------------------------------
  {
    id: "part-courtier-dossiers",
    type: "courtier_credit",
    titre: "« Je ne veux pas ralentir mes dossiers »",
    niveau: "normal",
    defi: "Il craint un frein sur ses dossiers et pense que la banque impose déjà l'assurance.",
    situation:
      "Tu es courtier en crédit hypothécaire. Tu dis « La banque impose déjà son assurance », puis « Je ne veux pas ralentir mes dossiers ». Tu acceptes si le conseiller dit qu'il ne touche pas au crédit, que son rôle est le revenu de remplacement pendant un arrêt de travail, que le bilan se fait en parallèle en une heure sans bloquer le dossier, puis propose deux créneaux. S'il parle de revenu « garanti », tu relèves le mot.",
  },
  {
    id: "part-courtier-concurrent",
    type: "courtier_credit",
    titre: "Le courtier qui vend aussi de l'assurance",
    niveau: "difficile",
    defi: "Il a déjà un assureur partenaire et se méfie d'un concurrent : montre ta spécialité.",
    situation:
      "Tu es courtier en crédit et tu vends aussi de l'assurance. Tu dis « J'ai déjà un assureur partenaire », puis tu demandes sèchement qui il est et ce qu'il veut. Tu acceptes seulement si le conseiller reste honnête, demande si ton assureur couvre les indépendants et les soignants (sa spécialité), dit qu'il peut prendre ceux-là sans te concurrencer sur le reste, évite tout engagement d'échange de clients sans l'avoir fait valider, et propose deux créneaux.",
  },
  // --- Agents immobiliers ------------------------------------------------------------------------------------------
  {
    id: "part-immo",
    type: "agent_immo",
    titre: "L'agent immobilier pressé",
    niveau: "normal",
    defi: "« J'ai déjà un courtier », « Mes acheteurs n'ont pas le temps », « Qu'est-ce que j'y gagne ? ».",
    situation:
      "Tu diriges une agence immobilière à Liège. Tu dis « J'ai déjà un courtier en crédit », puis « Mes acheteurs n'ont pas le temps », puis « Qu'est-ce que j'y gagne ? ». Tu acceptes si le conseiller dit qu'il ne remplace pas ton courtier (il prépare l'acheteur avant et le protège après), propose une heure en visio le soir, répond que tu y gagnes des ventes qui aboutissent sans promettre de commission, et propose deux créneaux.",
  },
  // --- Notaires ----------------------------------------------------------------------------------------------------
  {
    id: "part-notaire-temps",
    type: "notaire",
    titre: "Le notaire occupé",
    niveau: "normal",
    defi: "« La planification successorale, c'est mon métier » et « pas le temps pour les commerciaux ».",
    situation:
      "Tu es notaire dans une étude de Liège. Tu dis « On n'a pas le temps de recevoir des commerciaux », puis « La planification successorale, c'est mon métier ». Tu acceptes un rendez-vous de 20 minutes si le conseiller dit qu'il ne s'occupe que du volet assurance (capital décès, bénéficiaires, frais de succession), que tout le juridique reste chez toi, qu'il vient à l'étude, et propose deux créneaux.",
  },
  {
    id: "part-notaire-impartial",
    type: "notaire",
    titre: "Le notaire impartial",
    niveau: "difficile",
    defi: "« Je dois rester impartial » : ne demande jamais de recommander.",
    situation:
      "Tu es notaire, très attaché à ton impartialité. Tu dis « Je dois rester impartial » dès que le conseiller parle de rendez-vous. Si le conseiller te demande de le recommander ou te parle de commission, tu coupes net et tu refuses. Tu acceptes seulement s'il précise qu'il ne demande aucune recommandation, seulement de laisser sa carte à disposition, que le client choisit seul, qu'il est un relais d'information, et propose deux créneaux.",
  },
  // --- Kinés -------------------------------------------------------------------------------------------------------
  {
    id: "part-kine",
    type: "kine",
    titre: "Le kiné débordé",
    niveau: "normal",
    defi: "« On a déjà la PLCI », « chacun gère ses affaires », « on est débordés ».",
    situation:
      "Tu gères un cabinet de kinésithérapie de groupe à Liège. Tu dis « On a déjà la PLCI via l'INAMI », puis « Chacun gère ses affaires dans le cabinet », puis « On est débordés de patients ». Tu acceptes si le conseiller dit que la PLCI, c'est la pension, que le bilan regarde ce qui se passe pendant un arrêt (revenu de remplacement), qu'il le propose seulement à ceux qui le souhaitent, qu'une heure en visio le soir suffit, puis propose deux créneaux.",
  },
  // --- Fédérations -------------------------------------------------------------------------------------------------
  {
    id: "part-fede-commercial",
    type: "federation",
    titre: "« Pas de commercial dans nos formations »",
    niveau: "difficile",
    defi: "Elle a déjà des partenaires et refuse la vente : propose une formation sans vente.",
    situation:
      "Tu es responsable des formations d'une fédération de soignants indépendants. Tu dis « On a déjà des partenaires », puis « On ne fait pas de commercial dans nos formations », puis « Il faut passer par le conseil d'administration ». Tu acceptes si le conseiller dit qu'il vient en plus sur un sujet précis (la protection de l'indépendant), qu'il applique zéro vente pendant la formation et que tu peux relire le contenu avant, propose d'envoyer une page de présentation à soumettre au conseil et demande quand il se réunit, puis propose deux créneaux.",
  },
  // --- Secrétariats sociaux ----------------------------------------------------------------------------------------
  {
    id: "part-secso",
    type: "secretariat_social",
    titre: "Le bureau du secrétariat social",
    niveau: "normal",
    defi: "« Nous avons déjà un partenaire », « c'est le siège qui décide », « pas de données ».",
    situation:
      "Tu diriges un bureau régional d'un secrétariat social, à Liège. Tu dis « Nous avons déjà un partenaire assurance », puis « C'est le siège qui décide », puis « On ne peut pas transmettre de données ». Tu acceptes si le conseiller demande si ton partenaire couvre les soignants et les professions médicales, demande qui contacter au siège, précise qu'aucune donnée n'est transmise (tu remets simplement son contact à ceux qui le souhaitent), et propose deux créneaux.",
  },
];

/** Qui joue Claude, selon le type de partenaire. */
export const ROLE_PARTENAIRE: Record<TypeStructure, string> = {
  comptable: "responsable d'un cabinet comptable ou d'une fiduciaire",
  maison_repos: "directeur d'une maison de repos",
  tarification: "responsable d'une structure qui travaille avec des infirmiers et aides-soignants indépendants (bureau de tarification, agence de placement, soins à domicile)",
  courtier_credit: "courtier en crédit hypothécaire",
  agent_immo: "responsable d'une agence immobilière",
  notaire: "notaire d'une étude de Liège",
  kine: "responsable d'un cabinet de kinésithérapie de groupe",
  federation: "responsable des formations d'une fédération de soignants indépendants",
  secretariat_social: "responsable d'un bureau régional de secrétariat social ou de guichet d'entreprises",
  autre: "responsable d'une structure partenaire potentielle",
};

const MOTS_CLES_TXT = "Les 5 mots-clés : Preuve (partenaire de référence réel) → malade → question (puis silence) → accord → mardi-jeudi.";

/** Fil rouge, objections du type et objections communes, donnés à l'interlocuteur et à l'évaluation. */
export function methodePartenaire(type: TypeStructure): string {
  const s = SCRIPT_PAR_TYPE.get(type) ?? SCRIPT_PAR_TYPE.get("tarification")!;
  const communes = FAMILLES_OBJECTIONS.flatMap((f) => f.objections)
    .map((o) => `- ${o.ils_disent} : ${o.tu_reponds}`)
    .join("\n");
  const propres = s.objections.map((o) => `- ${o.ils_disent} : ${o.tu_reponds}`).join("\n");
  return `Fil rouge de l'appel à un partenaire (${s.titre}) :
Angle : ${s.angle}
1. Ouverture : ${s.ouverture}
2. La raison : ${s.raison}
3. La question : ${s.question} Puis se taire et laisser l'autre répondre.
4. La proposition : ${s.proposition}
5. Le rendez-vous : ${s.rdv}
6. Les objections : une objection est une information, pas un mur ; accueillir, répondre en une phrase, relancer par une question ou par les deux créneaux.
7. La clôture : répéter jour, heure, lieu ou e-mail, demander le nom de famille, annoncer un mail de confirmation dans l'heure.
${MOTS_CLES_TXT}

Objections propres à ce partenaire :
${propres}

Objections communes :
${communes}

Points de vigilance :
- Il parle environ 70 % du temps, le conseiller 30 % : le conseiller pose une vraie question puis se tait.
- Dire « vos soignants », « vos clients » ou « vos équipes » selon le partenaire, jamais « votre client » pour des soignants.
- Dire « revenu de remplacement » (pas « revenu garanti »), sans promesse de rendement.
- Ne jamais promettre de commission, de rétrocession ou d'avantage au partenaire, ni annoncer un montant : à faire valider par la conformité d'OVB Willemot avant d'en parler. Répondre sur la rémunération avec transparence, sans montant.
- Rester honnête sur le statut (« sous OVB Willemot, société agréée par la FSMA ») : ne dire « je suis agréé » que si c'est vrai pour soi.
- Placer le mot « accord » : aucune coordonnée n'est transmise sans l'accord de la personne concernée.
- Ne pas lire un texte : parler avec ses mots à partir des 5 mots-clés.`;
}

export const CRITERES_PARTENAIRE: Critere[] = [
  { id: "ouverture", label: "Ouverture : présentation, référence réelle, « deux minutes ? »" },
  { id: "raison", label: "La raison : ceux qu'ils accompagnent ne savent pas ce qu'ils toucheraient en cas d'arrêt" },
  { id: "question", label: "Une vraie question de découverte, puis le silence" },
  { id: "proposition", label: "Proposition : bilan offert, sans engagement, service pour le partenaire" },
  { id: "accord", label: "L'accord de la personne d'abord (rien transmis sans elle)" },
  { id: "transparence", label: "Transparence sur le statut et la rémunération (sans promesse)" },
  { id: "rdv", label: "Rendez-vous : deux créneaux précis, visio ou bureau" },
  { id: "cloture", label: "Clôture : jour, heure, lieu ou e-mail, nom de famille, confirmation" },
  { id: "objection", label: "Réponse aux objections (court, avec ses mots)" },
];

// --- Aide à la lecture --------------------------------------------------------------------------------------------

export const MOTS_CLES = ["Preuve", "malade", "question", "accord", "mardi-jeudi"] as const;

/** À éviter à l'oral, d'après les 8 appels d'entraînement. */
export const A_EVITER: string[] = [
  "« Votre client » pour des soignants : dire « vos soignants » ou « vos infirmiers ».",
  "« Plus de travail pour vous » : à l'oral, ça s'entend à l'envers. Dire « un infirmier malade ne facture plus rien, donc vous non plus ».",
  "« Les clients ne me paient rien » : la commission est incluse dans les primes. Dire que le bilan est gratuit et que c'est la compagnie qui rémunère.",
  "Les blagues sur la facture (« si vous voulez, je peux vous facturer ») : une personne méfiante peut mal les prendre.",
  "Citer MiFID pour de l'assurance : MiFID concerne les placements. Parler du statut réel (sous OVB Willemot, société agréée par la FSMA) et de l'intérêt du client.",
  "« Revenu garanti » : dire « revenu de remplacement ». Pas de promesse de rendement.",
  "Promettre une commission ou un avantage au partenaire, ou annoncer un montant, avant validation par la conformité d'OVB Willemot.",
];

// --- Suivi de la chasse aux partenaires --------------------------------------------------------------------------

export const STATUTS_CHASSE = [
  { id: "a_appeler", label: "À appeler", couleur: "#8a97ad" },
  { id: "appele", label: "Appelé", couleur: "#c99a3f" },
  { id: "rdv_fixe", label: "Rendez-vous fixé", couleur: "#2f6fb3" },
  { id: "rencontre", label: "Rencontré", couleur: "#7a5ab5" },
  { id: "partenaire", label: "Partenaire", couleur: "#1f8158" },
  { id: "sans_suite", label: "Pas intéressé", couleur: "#b3543a" },
  { id: "ecarte", label: "Écarté", couleur: "#5a6b85" },
] as const;

export type StatutChasse = (typeof STATUTS_CHASSE)[number]["id"];

/** Types de partenaires de la chasse (un onglet chacun) et la consigne affichée en tête de liste. */
export const TYPES_STRUCTURE = [
  { id: "comptable", label: "Comptables", consigne: "Ne pas promettre de commission avant validation OVB Willemot (déontologie ITAA)." },
  { id: "maison_repos", label: "Maisons de repos", consigne: "Cible : le directeur. Angle : garder son personnel (atelier + bilans offerts au personnel). Les résidents ne sont pas la cible." },
  { id: "tarification", label: "Tarification & soins", consigne: "Liège et environs d'abord, puis Wallonie. Bureaux de tarification, agences de placement et équipes de soins à domicile." },
  { id: "courtier_credit", label: "Courtiers crédit", consigne: "Beaucoup vendent aussi de l'assurance : vérifier au 1er appel s'ils sont concurrents. Profinance est déjà partenaire." },
  { id: "agent_immo", label: "Agents immobiliers", consigne: "Liège ville. Commencer par les agences qui ont un téléphone." },
  { id: "notaire", label: "Notaires", consigne: "Impartialité : ne jamais leur demander de « recommander ». Commencer par ton réseau. Source : CNAL (Chambre des notaires de Liège)." },
  { id: "kine", label: "Kinés", consigne: "Liège ville. Priorité aux cabinets de groupe. Téléphones à trouver." },
  { id: "federation", label: "Fédérations", consigne: "Peu d'acteurs : le seul vrai filon est d'obtenir UNE formation. Il faut d'abord un programme d'une page validé par OVB Willemot." },
  { id: "secretariat_social", label: "Secrétariats sociaux", consigne: "Viser les bureaux régionaux : les grands groupes ont souvent leurs propres partenaires." },
  { id: "autre", label: "Autre", consigne: "" },
] as const;

export type TypeStructure = (typeof TYPES_STRUCTURE)[number]["id"];

export const FORMATS_RDV_CHASSE = [
  { id: "visio", label: "En visio" },
  { id: "bureau", label: "Au bureau" },
] as const;
