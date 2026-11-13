// Entraînement aux appels téléphoniques : scénarios, profils de prospect et grille de retour.
// Tout vient du module 6 « L'appel téléphonique » (les 5 étapes de l'appel et l'argumentation). Les prospects sont fictifs :
// aucun nom de vrai client. Les séances terminées sont enregistrées (visibles par la hiérarchie).

export type Niveau = "facile" | "normal" | "difficile";

export interface Scenario {
  id: string;
  titre: string;
  niveau: Niveau;
  /** Ce que le collaborateur va devoir gérer, affiché avant l'appel. */
  defi: string;
  /** Consigne de jeu donnée au prospect fictif. */
  situation: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "ami-curieux",
    titre: "L'ami curieux",
    niveau: "facile",
    defi: "La personne accepte volontiers, mais son conjoint n'est pas dispo au premier créneau.",
    situation:
      "Tu es sympa et curieux(se) : tu acceptes volontiers de voir le collaborateur. Ton conjoint ne sera PAS disponible au premier créneau que le collaborateur propose  ; s'il insiste sur la présence du conjoint, tu acceptes un autre créneau. Tu acceptes la présence du formateur sans souci.",
  },
  {
    id: "formation-en-quoi",
    titre: "« Une formation en quoi ? »",
    niveau: "facile",
    defi: "La personne n'a pas bien compris l'annonce de la formation.",
    situation:
      "Quand le collaborateur parle de sa nouvelle formation, tu réponds : « Je n'ai pas très bien compris. Tu suis une formation en quoi ? ». Une fois que sa réponse est claire, tu acceptes de le voir. Ton conjoint est disponible et tu acceptes le formateur.",
  },
  {
    id: "pourquoi-moi",
    titre: "« Pourquoi moi ? »",
    niveau: "normal",
    defi: "« Je ne m'y connais pas du tout », dit la personne.",
    situation:
      "Objection à soulever dans tes propres mots : « Mais pourquoi moi ? Je ne m'y connais pas du tout ». Tu acceptes si le collaborateur te rassure clairement sur ton profil et propose un créneau précis. Conjoint et formateur : pas de problème.",
  },
  {
    id: "pas-le-temps",
    titre: "« Je n'ai pas le temps »",
    niveau: "normal",
    defi: "La personne n'a pas le temps et veut éviter le rendez-vous.",
    situation:
      "Objection à soulever dans tes propres mots : « Je n'ai pas le temps ! ». Tu acceptes si le collaborateur t'explique que c'est court (environ 30 minutes), à un moment qui t'arrange, avec une vraie proposition de dates. Conjoint et formateur : pas de problème.",
  },
  {
    id: "deja-client-ovb",
    titre: "Déjà client chez OVB",
    niveau: "normal",
    defi: "La personne a déjà une épargne-pension chez OVB.",
    situation:
      "Objection à soulever dans tes propres mots : « Je suis déjà client(e) chez OVB en épargne-pension ». Tu acceptes si le collaborateur t'explique que ton avis sur les services l'intéresse pour sa formation. Conjoint et formateur : pas de problème.",
  },
  {
    id: "deja-courtier",
    titre: "Déjà un courtier ou tout à la banque",
    niveau: "normal",
    defi: "La personne est déjà conseillée ailleurs.",
    situation:
      "Objection à soulever dans tes propres mots : « J'ai déjà un courtier qui me conseille » ou « J'ai déjà tout à ma banque ». Tu acceptes si le collaborateur propose une comparaison utile pour sa formation et un créneau précis. Conjoint et formateur : pas de problème.",
  },
  {
    id: "veux-vendre",
    titre: "« Tu veux me vendre quelque chose »",
    niveau: "difficile",
    defi: "La personne est méfiante et ferme dès le début.",
    situation:
      "Tu es méfiant. Dès que le collaborateur parle de rendez-vous, tu dis : « Tu veux me vendre quelque chose, je ne suis pas intéressé ». Tu insistes une fois si la réponse est floue. Tu ne cèdes que si le collaborateur te répond clairement, te demande un service pour sa formation et propose un créneau précis.",
  },
  {
    id: "cumul",
    titre: "Le cumul",
    niveau: "difficile",
    defi: "Une objection, puis le conjoint absent, puis le refus du formateur.",
    situation:
      "Tu cumules trois freins, l'un après l'autre : 1) une première objection au choix (« je n'ai pas le temps » ou « j'ai déjà un courtier ») ; 2) ton conjoint n'est pas disponible au créneau proposé ; 3) tu dis préférer que vous vous voyiez à deux, sans le formateur. Tu cèdes sur chaque point seulement si le collaborateur répond bien (il doit expliquer que le formateur est là pour le former et que c'est important pour lui).",
  },
];

export interface Profil {
  id: string;
  label: string;
  traits: string;
}

export const PROFILS: Profil[] = [
  { id: "collegue", label: "collègue de travail", traits: "tu connais le collaborateur du boulot ; ton direct, un peu pressé par la journée" },
  { id: "voisin", label: "voisin ou voisine", traits: "cordial, curieux, il aime discuter de la vie du quartier" },
  { id: "camarade", label: "ancien camarade", traits: "nostalgique et enthousiaste, vous avez fait vos études ensemble" },
  { id: "bavard", label: "personne très bavarde", traits: "tu racontes ta vie et tu dérives ; le collaborateur doit te ramener au sujet avec tact" },
  { id: "presse", label: "personne pressée", traits: "tu es au volant ou entre deux réunions, tu réponds court et tu veux conclure vite" },
  { id: "sceptique", label: "personne sceptique", traits: "tu doutes de tout, tu poses des questions précises" },
];

export const PRENOMS = ["Karim", "Sophie", "Nadia", "Julien", "Amina", "Thomas", "Laura", "Yanis", "Marie", "David", "Sarah", "Bruno"];

/** Étapes du fil rouge et de l'argumentation (module 6), données au prospect et à l'évaluation. */
export const METHODE = `Les 5 étapes de l'appel (module 6) :
1. Fixer le rendez-vous : « Allo ! C'est … à l'appareil » avec énergie et enthousiasme, quelques banalités (nouvelles, famille, boulot), puis la transition : « Je viens de débuter une nouvelle formation dans le secteur des finances et je voudrais avoir ton avis », puis « Quand est-ce que l'on peut se voir ? » avec une alternative : « Jour X ou jour Y ? En matinée ou en soirée ? Heure X ou heure Y ? »
2. Insister sur la présence du conjoint ou de la personne décisionnaire : « Ce sont des informations qui concernent le ménage. » Si indisponible : proposer un moment où il ou elle sera là, avec une nouvelle alternative.
3. Prévenir la présence du formateur : « Je serai accompagné de mon formateur, ça ira pour toi ? » Si la personne préfère être à deux : « Je suis en période de formation, c'est super important qu'il soit là, c'est pour me former et m'améliorer. Il est super sympa. »
4. Prendre l'adresse (rendez-vous en présentiel : demander d'épeler le nom de la rue pour le GPS) ou l'adresse e-mail (rendez-vous Zoom).
5. Clôturer : inviter à noter le rendez-vous dans son agenda, récapituler jour, heure et adresse, « Je compte vraiment sur toi », souhaiter une bonne journée.

Argumentation (réponses du module) :
- « Tu suis une formation en quoi ? » : une formation dans le secteur financier, conseiller sur les problématiques des 4 piliers de la sécurité sociale ; besoin de son avis, c'est surtout pour la formation ; puis proposer un créneau.
- « Pourquoi moi ? Je ne m'y connais pas » : justement c'est idéal, c'est le profil qu'il faut, voir un maximum de profils différents pour approfondir sa formation ; puis proposer un créneau.
- « Tu veux me vendre quelque chose » : répondre clairement, expliquer que le rendez-vous est dans le cadre de sa formation et qu'il a besoin d'un avis, que cela lui rendrait service ; puis proposer un créneau.
- « Je suis déjà client chez OVB » : très intéressant de se rencontrer pour avoir son avis sur les services et les points à améliorer.
- « J'ai déjà un courtier / tout à la banque » : parfait, cela permet de faire des comparaisons utiles à sa formation ; je suppose que tu veux ce qu'il y a de mieux pour toi ; puis jour X ou Y.
- « Je n'ai pas le temps » : justement, c'est pour ça que j'appelle d'abord ; le but n'est pas de tout expliquer maintenant mais de fixer un rendez-vous à un moment où tu es disponible ; ça ne prendra que 30 minutes ; quel jour te conviendrait ?`;

export interface Critere {
  id: string;
  label: string;
}

export const CRITERES: Critere[] = [
  { id: "accroche", label: "Énergie et banalités" },
  { id: "transition", label: "Transition vers la formation et demande d'avis" },
  { id: "alternative", label: "Alternative de dates (jour X ou Y, matin ou soir)" },
  { id: "conjoint", label: "Présence du conjoint ou du décisionnaire" },
  { id: "formateur", label: "Présence du formateur annoncée" },
  { id: "adresse", label: "Adresse ou e-mail épelé" },
  { id: "cloture", label: "Clôture : récapitulatif, agenda, « je compte sur toi »" },
  { id: "objection", label: "Réponse à l'objection" },
];

export interface Echange {
  role: "collab" | "prospect";
  text: string;
}

export interface RetourCritere {
  id: string;
  label: string;
  /** 0 = à retravailler, 1 = en partie, 2 = bien ; null = étape non atteinte pendant l'appel */
  score: 0 | 1 | 2 | null;
  commentaire: string;
}

export interface Retour {
  note: number;
  rdvObtenu: boolean;
  criteres: RetourCritere[];
  pointFort: string;
  pointAAmeliorer: string;
  exemple: string;
  motsARisque: string[];
}

export const MAX_ECHANGES = 30;
export const MAX_CARACTERES = 600;
