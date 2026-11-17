// Scripts d'appel par type de partenaire : comptables, maisons de repos, tarification, courtiers en crédit, agents immobiliers,
// notaires, kinés, fédérations, secrétariats sociaux. Contenu repris du document « Scripts partenaires » du 17 novembre 2026,
// avec trois adaptations validées pour l'équipe : « revenu de remplacement » (et non « revenu garanti », mot à risque FSMA),
// la phrase d'agrément nuancée (« sous OVB Willemot, société agréée ») et aucune promesse de rémunération avant validation
// par la conformité d'OVB Willemot. Les phrases concernées sont marquées « conformite ».

import type { TypeStructure } from "@/lib/entrainement-partenaires";

export interface ObjectionPartenaire {
  ils_disent: string;
  tu_reponds: string;
  /** Phrase sensible (rémunération, statut, échange de clients) : à faire valider par OVB Willemot avant de la diffuser. */
  conformite?: boolean;
}

export interface ScriptPartenaire {
  type: TypeStructure;
  titre: string;
  /** Pourquoi ce partenaire, ce qu'on lui apporte. */
  angle: string;
  ouverture: string;
  raison: string;
  question: string;
  proposition: string;
  rdv: string;
  objections: ObjectionPartenaire[];
  /** Conseil ou astuce propre au type. */
  astuce?: string;
  /** Ce qu'il faut avant d'appeler. */
  avant?: string;
  /** Groupe nominal pour parler des gens que le partenaire accompagne (mail de confirmation). */
  public: string;
}

export const SCRIPTS_PARTENAIRES: ScriptPartenaire[] = [
  {
    type: "comptable",
    titre: "Comptables et fiduciaires",
    public: "vos clients",
    angle: "Tu protèges leurs clients indépendants, et tu leur renvoies l'ascenseur quand un de tes clients cherche un comptable (échange de clients à faire valider par OVB Willemot avant de l'évoquer).",
    ouverture:
      "« Bonjour, [prénom nom], de Prepared Minds Team. J'accompagne des indépendants et des soignants dans la région de Liège, notamment avec [partenaire de référence]. Je parle bien à Monsieur / Madame [nom] ? Vous avez deux minutes ? »",
    raison:
      "« Vous connaissez les chiffres de vos clients indépendants mieux que personne. Et je constate une chose : presque aucun ne sait ce qu'il toucherait s'il tombait malade demain. Quand un indépendant s'arrête, ses revenus s'arrêtent, et souvent il ne peut plus payer ses factures, les vôtres comprises. »",
    question: "« Est-ce que certains de vos clients se sont déjà retrouvés en difficulté après un arrêt, ou vous ont demandé comment payer moins d'impôts en préparant leur pension ? »",
    proposition:
      "« Je propose un bilan de protection offert à vos clients, sans engagement : revenu en cas d'arrêt, pension, PLCI, EIP, déductions fiscales. Vous recevez un compte rendu si le client le souhaite, rien ne se fait dans votre dos. »",
    rdv: "« On en parle 20 minutes autour d'un café ? Mardi 15h ou jeudi 10h, à votre bureau ou en visio ? »",
    objections: [
      { ils_disent: "« On fait déjà le conseil fiscal. »", tu_reponds: "« Justement, je ne touche pas à votre métier. Vous calculez l'impôt, moi je mets en place les contrats qui le réduisent. On se complète. »" },
      { ils_disent: "« Nos clients ont déjà leur banque. »", tu_reponds: "« Très bien. Le bilan vérifie que ce qu'ils ont les couvre vraiment. Souvent, il y a des trous, surtout sur l'incapacité. »" },
      {
        ils_disent: "« Je ne veux pas engager ma responsabilité. »",
        tu_reponds: "« Vous n'engagez rien : vous transmettez mon contact, le client décide seul. Je travaille sous OVB Willemot, société agréée par la FSMA. »",
        conformite: true,
      },
      {
        ils_disent: "« Vous me reversez quoi ? »",
        tu_reponds: "« On en parle au rendez-vous, en toute transparence. Ce qui compte d'abord, c'est le service à vos clients. » (Ne jamais annoncer un montant avant la validation par OVB Willemot.)",
        conformite: true,
      },
    ],
    astuce: "Déontologie ITAA : ne promets aucune commission avant validation par OVB Willemot.",
  },
  {
    type: "maison_repos",
    titre: "Directeurs de maisons de repos",
    public: "vos équipes",
    angle: "Le directeur se bat pour garder son personnel. Tu lui offres un avantage pour ses équipes qui ne lui coûte rien : un atelier sur place et des bilans offerts. Les résidents ne sont pas la cible.",
    ouverture:
      "« Bonjour, [prénom nom], de Prepared Minds Team. J'accompagne des infirmiers et aides-soignants, notamment avec [partenaire de référence] qui place des soignants en maison de repos. Je parle bien au directeur ? Vous avez deux minutes ? »",
    raison:
      "« Vous le savez mieux que moi : garder ses soignants, c'est le nerf de la guerre. Beaucoup partent pour quelques euros de plus, et quand l'un d'eux tombe malade, c'est tout le planning qui saute. Et la plupart ne savent pas ce qu'ils toucheraient en cas d'arrêt. »",
    question: "« Qu'est-ce que vous offrez aujourd'hui à votre personnel, en plus du salaire, pour qu'il reste chez vous ? »",
    proposition:
      "« Je propose un avantage gratuit pour vos équipes : un atelier de 45 minutes sur place, « Mon argent, ma protection, ma pension », puis un bilan offert à ceux qui le souhaitent. Personne n'est obligé, rien ne se fait sans leur accord, et ça ne vous coûte rien. »",
    rdv: "« On en parle 20 minutes dans votre bureau ? Mardi 15h ou jeudi 10h ? »",
    objections: [
      { ils_disent: "« Mon personnel n'a pas le temps. »", tu_reponds: "« L'atelier se cale sur un changement d'équipe ou une pause, 45 minutes maximum. Les bilans se font en dehors des heures de travail. »" },
      { ils_disent: "« Je ne veux pas de démarchage dans ma maison. »", tu_reponds: "« Moi non plus. C'est de l'information, pas de la vente. Je ne contacte que ceux qui le demandent. »" },
      { ils_disent: "« Il faut passer par le groupe / le siège. »", tu_reponds: "« Bien sûr. Qui dois-je contacter au siège, et puis-je dire que je viens de votre part ? »" },
      { ils_disent: "« On a déjà une assurance groupe. »", tu_reponds: "« Très bien. L'atelier aide justement vos équipes à comprendre ce qu'elle couvre, et ce qu'elle ne couvre pas, surtout pour les indépendants. »" },
    ],
    astuce: "Un directeur connaît d'autres directeurs. En fin de rendez-vous, demande : « Quels sont deux collègues directeurs à qui ça rendrait service ? »",
  },
  {
    type: "tarification",
    titre: "Bureaux de tarification et agences de soignants",
    public: "vos soignants",
    angle: "Le bureau facture les soins de ses infirmiers chaque mois. Un infirmier malade ne facture plus rien, donc le bureau non plus.",
    ouverture:
      "« Bonjour, [prénom nom], de Prepared Minds Team. Je travaille avec des infirmiers et aides-soignants indépendants, notamment avec [partenaire de référence]. Je parle bien au responsable du bureau ? Vous avez deux minutes ? »",
    raison:
      "« Vous connaissez vos infirmiers mieux que personne : vous voyez leurs revenus chaque mois. Presque aucun ne sait ce qu'il toucherait s'il tombait malade demain. Un infirmier malade ne facture plus rien, donc vous non plus. »",
    question: "« Est-ce que certains de vos infirmiers vous ont déjà parlé d'un arrêt maladie, d'une blessure ou de leur pension ? »",
    proposition:
      "« Un bilan de protection offert à vos infirmiers, sans engagement : revenu en cas d'arrêt, pension, déductions fiscales. Ce sont eux qui donnent leur accord d'abord, vous ne me transmettez rien sans eux. Pour vous, un service qui fidélise, sans aucun travail. »",
    rdv: "« On en parle 20 minutes : mardi 15h ou jeudi 10h, en visio ou à votre bureau ? »",
    objections: [
      { ils_disent: "« On travaille déjà avec un courtier. »", tu_reponds: "« Très bien. Et tous vos infirmiers sont passés chez lui ? Un deuxième avis ne coûte rien, et c'est vous qui leur offrez ce service. »" },
      { ils_disent: "« Je ne peux pas vous donner leurs coordonnées. »", tu_reponds: "« Bien sûr. Ce sont vos infirmiers qui donnent leur accord d'abord, vous ne me transmettez rien sans eux. »" },
    ],
    astuce: "Pour une agence de placement : remplace « vos infirmiers » par « vos soignants », et ajoute l'argument concurrence : « Ce bilan, c'est un avantage que votre concurrent n'offre pas. Ça aide à garder vos soignants. »",
  },
  {
    type: "courtier_credit",
    titre: "Courtiers en crédit hypothécaire",
    public: "vos emprunteurs",
    angle:
      "Le courtier boucle un crédit sur 20 ou 25 ans. Ce qui menace son dossier, c'est l'emprunteur qui tombe malade et ne paie plus. Toi, tu t'occupes de la protection du revenu ; lui t'envoie ses emprunteurs (échange de clients à faire valider par OVB Willemot).",
    ouverture: "« Bonjour, [prénom nom], de Prepared Minds Team. J'accompagne des indépendants et des soignants dans la région de Liège. Je parle bien à Monsieur / Madame [nom] ? Vous avez deux minutes ? »",
    raison:
      "« Vos clients signent pour 20 ou 25 ans. L'assurance solde restant dû couvre surtout le décès, pas toujours une longue incapacité de travail. Qui paie les mensualités pendant l'arrêt ? »",
    question: "« Combien de vos emprunteurs sont indépendants ? Et combien ont une vraie protection de leur revenu ? »",
    proposition: "« Un bilan offert à vos emprunteurs avant la signature : revenu de remplacement en cas d'arrêt, solde restant dû, épargne fiscale. »",
    rdv: "« On en parle 20 minutes : mardi 15h ou jeudi 10h, à votre bureau ou en visio ? »",
    objections: [
      { ils_disent: "« La banque impose déjà son assurance. »", tu_reponds: "« Le client peut choisir son assureur pour le solde restant dû, et je ne touche pas au crédit. Mon rôle, c'est le revenu pendant un arrêt : la banque ne le couvre pas. »" },
      { ils_disent: "« Je ne veux pas ralentir mes dossiers. »", tu_reponds: "« Le bilan se fait en parallèle, en une heure, et ne bloque rien. Au contraire, un emprunteur protégé rassure la banque. »" },
      { ils_disent: "« J'ai déjà un assureur partenaire. »", tu_reponds: "« Très bien. Couvre-t-il les indépendants et les soignants ? C'est ma spécialité, je peux prendre ceux-là. »" },
    ],
    astuce: "Beaucoup de courtiers vendent aussi de l'assurance : vérifie au premier appel s'ils sont concurrents.",
  },
  {
    type: "agent_immo",
    titre: "Agents immobiliers",
    public: "vos acheteurs",
    angle: "L'agent est payé quand la vente passe. Ce qui la fait capoter, c'est souvent un acheteur que la banque refuse. Un acheteur indépendant bien préparé et bien protégé, c'est une vente qui aboutit.",
    ouverture: "« Bonjour, [prénom nom], de Prepared Minds Team. J'accompagne des indépendants et des soignants dans la région de Liège. Je parle bien à Monsieur / Madame [nom] ? Vous avez deux minutes ? »",
    raison:
      "« Vos acheteurs indépendants ont souvent du mal à convaincre la banque : revenus irréguliers, pas d'épargne claire, aucune protection. Et une vente qui tombe, c'est des semaines perdues pour vous. »",
    question: "« Combien de compromis avez-vous vu tomber cette année faute de financement ? »",
    proposition: "« Avant de voir la banque, j'offre un bilan à vos acheteurs : revenus, protection, épargne. Un dossier plus solide, une vente qui passe. »",
    rdv: "« On en parle 20 minutes : mardi 15h ou jeudi 10h, à votre agence ou en visio ? »",
    objections: [
      { ils_disent: "« J'ai déjà un courtier en crédit. »", tu_reponds: "« Parfait, je ne le remplace pas. Je prépare l'acheteur avant, et je le protège après la signature. »" },
      { ils_disent: "« Mes acheteurs n'ont pas le temps. »", tu_reponds: "« Une heure en visio, le soir s'il le faut. C'est une heure qui peut sauver leur achat. »" },
      {
        ils_disent: "« Qu'est-ce que j'y gagne ? »",
        tu_reponds: "« Des ventes qui aboutissent. » (L'échange de clients — « quand un de mes clients cherche à acheter ou à vendre, je pense à vous » — est à faire valider par OVB Willemot avant de l'utiliser.)",
        conformite: true,
      },
    ],
  },
  {
    type: "notaire",
    titre: "Notaires",
    public: "vos clients",
    angle:
      "Le notaire voit les familles à deux moments clés : l'achat d'un bien et la succession. Il constate souvent que rien n'était prévu. Il est tenu à l'impartialité : ne lui demande jamais de « recommander » un produit. Propose-lui d'être un relais d'information pour ses clients.",
    ouverture: "« Bonjour, [prénom nom], de Prepared Minds Team. J'accompagne des familles et des indépendants dans la région de Liège. Je parle bien à Maître [nom] ? Vous avez deux minutes ? »",
    raison: "« À la succession, beaucoup de familles découvrent qu'aucun capital n'avait été prévu, ou qu'un bénéficiaire était mal désigné. Vous le voyez sans doute souvent. »",
    question: "« Qu'est-ce qui revient le plus souvent chez vos clients : les frais de succession, les bénéficiaires, ou le conjoint mal protégé ? »",
    proposition:
      "« Je prépare avec vos clients ce qui relève de l'assurance : capital décès, bénéficiaires bien désignés, frais de succession anticipés. Tout ce qui est juridique reste chez vous. »",
    rdv: "« On en parle 20 minutes à votre étude ? Mardi 15h ou jeudi 10h ? »",
    objections: [
      { ils_disent: "« Je dois rester impartial. »", tu_reponds: "« Bien sûr. Je ne vous demande pas de me recommander, seulement de laisser ma carte à disposition. Le client choisit seul. »" },
      { ils_disent: "« La planification successorale, c'est mon métier. »", tu_reponds: "« Absolument. Moi, je m'occupe uniquement du volet assurance, et tout ce qui est juridique reste chez vous. »" },
      { ils_disent: "« On n'a pas le temps de recevoir des commerciaux. »", tu_reponds: "« Je comprends. 20 minutes suffisent pour voir si on peut se compléter, et je viens à votre étude. »" },
    ],
    astuce: "Commence par un notaire de ton réseau, ou rencontré lors d'un achat d'un de tes clients. Un appel à froid auprès d'une étude marche rarement.",
  },
  {
    type: "kine",
    titre: "Kinés et cabinets paramédicaux",
    public: "les membres de votre cabinet",
    angle:
      "Le kiné travaille avec son corps : une épaule ou un dos bloqué, et son revenu tombe à zéro. Dans un cabinet de groupe, l'arrêt d'un associé pèse aussi sur les autres (loyer, secrétariat, patients à reprendre). Ta cible : le kiné qui gère le cabinet, ou le responsable d'un groupement.",
    ouverture: "« Bonjour, [prénom nom], de Prepared Minds Team. J'accompagne des soignants indépendants dans la région de Liège. Je parle bien à la personne qui gère le cabinet ? Vous avez deux minutes ? »",
    raison:
      "« Un kiné qui se blesse ne travaille plus du tout, et la mutuelle ne remplace qu'une partie de ce qu'il gagne. Dans un cabinet, ce sont aussi les associés qui paient le loyer à sa place. »",
    question: "« Si l'un de vos associés s'arrêtait trois mois demain, comment le cabinet ferait-il ? »",
    proposition: "« Un bilan offert à chaque membre du cabinet, et pour un groupement, un atelier de 45 minutes : revenu de remplacement, PLCI et INAMI, pension. »",
    rdv: "« On en parle 20 minutes : mardi 15h ou jeudi 10h, au cabinet ou en visio ? »",
    objections: [
      { ils_disent: "« On a déjà la PLCI via l'INAMI. »", tu_reponds: "« Très bien, c'est la pension. Le bilan regarde surtout ce qui se passe pendant un arrêt : c'est là qu'il y a souvent un trou. »" },
      { ils_disent: "« Chacun gère ses affaires dans le cabinet. »", tu_reponds: "« Bien sûr, chacun décide seul. Je propose juste le bilan à ceux qui le souhaitent, et un associé protégé protège aussi le cabinet. »" },
      { ils_disent: "« On est débordés de patients. »", tu_reponds: "« Justement, c'est quand on est débordé qu'on se blesse. Une heure en visio, le soir ou pendant un trou dans l'agenda. »" },
    ],
  },
  {
    type: "federation",
    titre: "Fédérations et associations de soignants",
    public: "vos membres",
    angle:
      "Une fédération vit de ce qu'elle apporte à ses membres : formations, avantages, défense. Tu lui offres une formation gratuite qui la valorise. Un seul accord ouvre des centaines de portes. Ta cible : le président ou le responsable des formations.",
    ouverture: "« Bonjour, [prénom nom], de Prepared Minds Team. J'accompagne des soignants indépendants. Je parle bien au responsable des formations ? Vous avez deux minutes ? »",
    raison: "« Vos membres sont indépendants. Ils vous posent sans doute des questions sur leur pension, leurs impôts ou ce qu'ils toucheraient en cas d'arrêt. Ce sont des sujets où ils sont souvent seuls. »",
    question: "« Quelles sont les questions que vos membres vous posent le plus, en dehors du soin ? »",
    proposition:
      "« Une formation gratuite de 1 h à 1 h 30 pour vos membres : « Indépendant et protégé » (revenu en cas d'arrêt, PLCI, pension, déductions). Aucune vente pendant la formation. Ceux qui veulent un bilan me laissent leurs coordonnées. »",
    rdv: "« On en parle 20 minutes : mardi 15h ou jeudi 10h, en visio ou chez vous ? »",
    objections: [
      { ils_disent: "« On a déjà des partenaires. »", tu_reponds: "« Très bien. Je viens en plus, sur un sujet précis : la protection de l'indépendant. Je ne remplace personne. »" },
      { ils_disent: "« On ne fait pas de commercial dans nos formations. »", tu_reponds: "« C'est précisément ma règle aussi : zéro vente pendant la formation. Vous pouvez relire le contenu avant. »" },
      { ils_disent: "« Il faut passer par le conseil d'administration. »", tu_reponds: "« Bien sûr. Je peux vous envoyer une page de présentation à leur soumettre. Quand se réunit-il ? »" },
    ],
    avant: "Un programme de formation d'une page, validé par OVB Willemot.",
  },
  {
    type: "secretariat_social",
    titre: "Secrétariats sociaux et guichets d'entreprise",
    public: "vos nouveaux affiliés",
    angle:
      "Ils voient chaque nouvel indépendant démarrer : affiliation, cotisations sociales, numéro d'entreprise. Ils ne s'occupent ni de sa protection ni de son épargne. Les grands secrétariats ont leurs propres partenaires : vise les bureaux régionaux et les petites structures indépendantes.",
    ouverture: "« Bonjour, [prénom nom], de Prepared Minds Team. J'accompagne des indépendants et des soignants dans la région de Liège. Je parle bien au responsable du bureau ? Vous avez deux minutes ? »",
    raison: "« Vous voyez chaque nouvel indépendant démarrer. La plupart ne savent pas qu'ils n'ont presque aucune protection s'ils tombent malades, ni qu'ils peuvent payer moins d'impôts dès la première année. »",
    question: "« Qu'est-ce que vos nouveaux affiliés vous demandent le plus souvent, et que vous ne pouvez pas traiter vous-mêmes ? »",
    proposition: "« Un bilan de démarrage offert à vos nouveaux affiliés : revenu de remplacement, PLCI, pension, déductions. Vous le proposez comme un service en plus, je m'occupe du reste. »",
    rdv: "« On en parle 20 minutes : mardi 15h ou jeudi 10h, à votre bureau ou en visio ? »",
    objections: [
      { ils_disent: "« Nous avons déjà un partenaire assurance. »", tu_reponds: "« Très bien. Couvre-t-il les soignants et les professions médicales ? C'est ma spécialité. »" },
      { ils_disent: "« C'est le siège qui décide. »", tu_reponds: "« Bien sûr. Qui dois-je contacter au siège, et puis-je dire que je viens de votre part ? »" },
      { ils_disent: "« On ne peut pas transmettre de données. »", tu_reponds: "« Aucune donnée. Vous remettez simplement mon contact à ceux qui le souhaitent, ils m'appellent eux-mêmes. »" },
    ],
  },
];

export const SCRIPT_PAR_TYPE = new Map<string, ScriptPartenaire>(SCRIPTS_PARTENAIRES.map((s) => [s.type, s]));

// --- Objections communes, en 6 familles --------------------------------------------------------------------------

export interface ObjectionCommune extends ObjectionPartenaire {
  /** Testée dans les appels d'entraînement du 17 novembre (jeux de rôle avec Claude, pas des appels réels). */
  testee?: boolean;
}

export const FAMILLES_OBJECTIONS: { titre: string; objections: ObjectionCommune[] }[] = [
  {
    titre: "Au décroché : le barrage",
    objections: [
      { ils_disent: "« C'est à quel sujet ? » (secrétariat)", tu_reponds: "« Je travaille avec [partenaire de référence] sur la protection des soignants indépendants, et j'aimerais en parler deux minutes avec [nom]. Il est là ? »" },
      { ils_disent: "« Il est en réunion. »", tu_reponds: "« Pas de souci. À quelle heure est-il le plus facile à joindre ? Je rappelle à ce moment-là. » (Note l'heure, rappelle pile.)" },
      { ils_disent: "« Rappelez-moi la semaine prochaine. »", tu_reponds: "« Deux minutes maintenant suffisent pour voir si ça vous intéresse. » Si vraiment non : « Mardi 9h ou jeudi 14h ? » et tu le mets dans l'agenda.", testee: true },
      { ils_disent: "« Je n'ai pas le temps. »", tu_reponds: "« Justement, je serai bref. Une seule question : [ta question de découverte]. »" },
    ],
  },
  {
    titre: "Sur l'intérêt",
    objections: [
      { ils_disent: "« Ça ne m'intéresse pas. »", tu_reponds: "« Je comprends. Est-ce parce que vos [clients / soignants] sont déjà bien protégés, ou parce que ce n'est pas le bon moment ? »" },
      { ils_disent: "« On travaille déjà avec quelqu'un. »", tu_reponds: "« Très bien. Et tous vos [clients] sont passés chez lui ? » puis « Un deuxième avis ne coûte rien, et c'est vous qui leur offrez ce service. »", testee: true },
      { ils_disent: "« Leur assurance, c'est leur affaire. »", tu_reponds: "« Tout à fait, c'est eux qui décident. Mais quand l'un d'eux s'arrête, c'est aussi votre activité qui s'arrête. »" },
      { ils_disent: "« On fait déjà ça nous-mêmes. »", tu_reponds: "« Très bien. Sur quel volet : le revenu en cas d'arrêt, ou la pension ? C'est souvent le premier qui manque. »" },
    ],
  },
  {
    titre: "Sur la confiance",
    objections: [
      {
        ils_disent: "« Vous êtes courtier ? »",
        tu_reponds: "« Je suis conseiller financier, sous OVB Willemot. Mais je ne vous appelle pas pour vous vendre une assurance. Je vous appelle parce que vous connaissez vos [clients / soignants] mieux que personne. »",
        conformite: true,
        testee: true,
      },
      {
        ils_disent: "« Un assureur nous a déjà déçus. »",
        tu_reponds: "« Je comprends. Ma règle, c'est de protéger avant de vendre. Si la personne n'a besoin de rien, je le lui dis. Commençons par deux ou trois personnes, et vous jugerez sur pièce. »",
        testee: true,
      },
      {
        ils_disent: "« Qu'est-ce qui me garantit… ? »",
        tu_reponds: "« Je travaille sous OVB Willemot, société agréée par la FSMA, et je dois agir dans l'intérêt du client. Et vous recevez un compte rendu si la personne le souhaite. » (Dis « je suis agréé » seulement si tu l'es toi-même.)",
        conformite: true,
        testee: true,
      },
      { ils_disent: "« Vous êtes seul ? »", tu_reponds: "« J'ai une équipe de [nombre réel] personnes, et je suis à temps plein. » (Dis la vérité pour toi.)", testee: true },
      { ils_disent: "« Vous faites quoi avec [partenaire de référence] ? »", tu_reponds: "« [Partenaire] m'envoie ses soignants qui le souhaitent, et je leur fais un bilan de protection. »", testee: true },
      {
        ils_disent: "« Ça a déjà donné quoi ? »",
        tu_reponds: "Un résultat concret, sans nom, et seulement s'il est vrai : « Un infirmier vient de mettre en place sa pension et sa protection décès. »",
        testee: true,
      },
    ],
  },
  {
    titre: "Sur l'argent",
    objections: [
      { ils_disent: "« Ça me coûte combien ? »", tu_reponds: "« Rien. Le bilan est offert à vos [clients], et vous n'avez aucun travail. »" },
      {
        ils_disent: "« Gratuit ? Vous gagnez votre vie comment ? »",
        tu_reponds: "« Le bilan est gratuit. Si la personne décide de mettre une solution en place, c'est la compagnie qui me rémunère. »",
        conformite: true,
        testee: true,
      },
      {
        ils_disent: "« Vous touchez combien ? » / « Et moi, j'y gagne quoi ? »",
        tu_reponds: "« On en discute au rendez-vous, en toute transparence. » (Aucun montant ni promesse d'avantage avant la validation par OVB Willemot.)",
        conformite: true,
        testee: true,
      },
    ],
  },
  {
    titre: "Sur la confidentialité",
    objections: [
      { ils_disent: "« Je ne peux pas vous donner leurs coordonnées. »", tu_reponds: "« Bien sûr. Ce sont eux qui donnent leur accord d'abord, vous ne me transmettez rien sans eux. »", testee: true },
      { ils_disent: "« Je ne veux pas qu'ils se sentent vendus. »", tu_reponds: "« Moi non plus. C'est vous qui leur proposez un service, ils choisissent librement, et personne n'est relancé sans l'avoir demandé. »", testee: true },
    ],
  },
  {
    titre: "Sur le rendez-vous",
    objections: [
      { ils_disent: "« Envoyez-moi un mail. »", tu_reponds: "« Avec plaisir, juste après qu'on se soit parlé 20 minutes. Mardi ou jeudi ? »", testee: true },
      { ils_disent: "« Envoyez-moi une documentation. »", tu_reponds: "« Je vous l'envoie. Pour qu'elle colle à votre situation, on en parle 20 minutes avant : mardi 15h ou jeudi 10h ? »" },
      { ils_disent: "« Je dois en parler à mon associé. »", tu_reponds: "« Bien sûr. Le plus simple : on se voit tous les trois. Mardi ou jeudi, qu'est-ce qui l'arrange ? »" },
      { ils_disent: "« Je vous rappelle. »", tu_reponds: "« Volontiers. Pour ne pas jouer au ping-pong, on bloque déjà un créneau, et vous le déplacez si besoin. Mardi ou jeudi ? »" },
    ],
  },
];

export const PRINCIPES_COMMUNS: { mot: string; etape: string; action: string }[] = [
  { mot: "Preuve", etape: "Ouverture", action: "Ton nom, Prepared Minds Team, et un partenaire de référence (seulement s'il est réel)" },
  { mot: "Malade", etape: "La raison", action: "Leurs clients, résidents ou soignants ne savent pas ce qu'ils toucheraient en cas d'arrêt" },
  { mot: "Question", etape: "Découverte", action: "Une question ouverte, puis tu te tais" },
  { mot: "Accord", etape: "La proposition", action: "Bilan offert, rien dans leur dos, la personne donne son accord d'abord" },
  { mot: "Mardi-jeudi", etape: "Le rendez-vous", action: "Deux créneaux précis, visio ou bureau" },
];

export const REGLES_OR: string[] = [
  "Il parle 70 %, toi 30 %.",
  "Quand il raconte une histoire, rebondis : « C'est exactement pour des cas comme celui-là que je vous appelle. »",
  "Toujours deux créneaux précis : « Mardi 15h ou jeudi 10h ? »",
  "Toujours répéter jour, heure, lieu ou e-mail, et demander le nom de famille.",
  "Jamais de commission promise au téléphone : le montant est d'abord validé par OVB Willemot (conformité FSMA).",
  "Vouvoiement par défaut.",
];

export const APRES_APPEL: string[] = [
  "Le rendez-vous n'existe vraiment qu'une fois confirmé par écrit, dans l'heure : mail de confirmation envoyé.",
  "Rendez-vous dans l'agenda, avec description et rappels.",
  "Appel noté dans ta liste de chasse : date, résultat, prochaine étape.",
  "Pas de réponse au J+5 : relance ou nouvel appel (la chasse te le rappelle).",
];

// --- Mail de confirmation ------------------------------------------------------------------------------------------

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « jeudi 19 novembre à 10h » depuis une valeur datetime-local (heure de Bruxelles). */
export function rdvEnTexte(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return "[jour] à [heure]";
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const jour = JOURS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${jour} ${d} ${MOIS[mo - 1]} à ${h}h${mi ? String(mi).padStart(2, "0") : ""}`;
}

export interface EntreeMail {
  type: string;
  contact: string | null;
  rdvLocal: string;
  format: string;
  lieu: string;
  moi: { nom: string; tel: string | null };
}

/** Mail de confirmation du rendez-vous (à envoyer dans l'heure). Aucune coordonnée personnelle de quelqu'un d'autre : celles de la personne connectée. */
export function mailConfirmation(e: EntreeMail): { objet: string; corps: string } {
  const quand = rdvEnTexte(e.rdvLocal);
  const sc = SCRIPT_PAR_TYPE.get(e.type);
  const public_ = sc?.public ?? "vos contacts";
  const salut = e.contact && /^[A-ZÀ-Ý][\p{L}'’-]+(\s+[A-ZÀ-Ý][\p{L}'’-]+){1,3}$/u.test(e.contact) ? `Bonjour ${e.contact},` : "Bonjour,";
  const ou = e.format === "visio" ? `en visio${e.lieu ? ` : ${e.lieu}` : " (je vous envoie le lien)"}` : e.lieu ? `à ${e.lieu}` : "[à votre bureau, adresse]";
  const joindre = e.moi.tel ? `Si un empêchement survient, vous pouvez me joindre au ${e.moi.tel}.` : "Si un empêchement survient, répondez simplement à ce mail.";
  return {
    objet: `Notre rendez-vous du ${quand}`,
    corps: `${salut}

Merci pour notre échange. Je vous confirme notre rendez-vous le ${quand}, ${ou}.

En 20 minutes, je vous présenterai comment nous pourrions offrir un bilan de protection à ${public_}, sans engagement et sans aucun travail de votre côté.

${joindre}

Bien à vous,
${e.moi.nom} — Prepared Minds Team`,
  };
}
