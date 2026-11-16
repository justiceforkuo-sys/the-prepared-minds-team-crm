// Entraînement à la prise de recommandations : scénarios, méthode en 7 étapes et grille de retour.
// Contenu repris de la formation « La prise de recommandations » de Futurs Leaders (workshop de 60 minutes), adapté à nos
// rendez-vous en ligne ou en présentiel. Les clients sont fictifs : aucun vrai nom, aucun vrai numéro. Les séances terminées
// sont enregistrées dans la même table que l'entraînement aux appels (entrainement_seances, scenario_id préfixé « reco- »).

import type { Scenario } from "@/lib/entrainement";

export type FormatRdv = "ligne" | "presentiel";

export const FORMATS: { id: FormatRdv; label: string }[] = [
  { id: "ligne", label: "En ligne (visio)" },
  { id: "presentiel", label: "En présentiel" },
];

export const PREFIXE_RECO = "reco-";

export const SCENARIOS_RECO: Scenario[] = [
  {
    id: "reco-convaincu",
    titre: "Le convaincu",
    niveau: "facile",
    defi: "Ravi du rendez-vous, il veut aider mais ne sait pas par où commencer : guide-le cercle par cercle.",
    situation:
      "Tu es ravi(e) du rendez-vous : tu mets 9/10. Tu veux aider mais tu ne sais pas par où commencer : tu dis « je ne sais pas trop à qui penser ». Tu ne trouves des noms que si le conseiller te fait réfléchir cercle par cercle (famille, amis, collègues, parents, corps médical, indépendants). Tu finis par donner 5 prénoms fictifs avec leur lien (par exemple « ma sœur Julie », « mon collègue Marc »).",
  },
  {
    id: "reco-prudent",
    titre: "Le prudent",
    niveau: "normal",
    defi: "Il veut d'abord demander l'accord de ses proches : rassure-le grâce au message de prévention.",
    situation:
      "Tu es content(e) du rendez-vous (8/10) mais tu dis : « Je préfère d'abord leur demander. » Tu te rassures si le conseiller t'explique que ses proches seront d'abord prévenus par un petit message, qu'ils restent libres de dire non, et que tu peux relire le message. Ensuite tu acceptes et tu donnes 3 prénoms fictifs avec leur lien.",
  },
  {
    id: "reco-presse",
    titre: "Le pressé",
    niveau: "normal",
    defi: "Il regarde sa montre : garde l'énergie, reste bref et précis.",
    situation:
      "Tu regardes ta montre : tu as un autre rendez-vous dans 10 minutes. Tu réponds court. Tu donnes ta note (8/10) vite. Tu acceptes seulement si le conseiller reste bref, énergique et précis, sans se répandre. Tu donnes 3 prénoms fictifs avec leur lien. S'il traîne ou s'il s'excuse, tu coupes court.",
  },
  {
    id: "reco-pas-personne",
    titre: "« Je ne connais personne »",
    niveau: "normal",
    defi: "Objection n° 2 de la formation : on y va cercle par cercle, sans lâcher.",
    situation:
      "Objection à soulever dans tes propres mots : « Je ne connais personne », « je ne vois pas à qui ». Tu cèdes seulement si le conseiller te fait réfléchir cercle par cercle (famille, amis, collègues…) avec des questions précises (« Qui travaille dans ta famille ? »). Tu donnes alors 2 ou 3 prénoms fictifs avec leur lien.",
  },
  {
    id: "reco-deranger",
    titre: "« Je ne veux pas déranger mes proches »",
    niveau: "difficile",
    defi: "Objection n° 3 de la formation : montre que c'est un service et qu'ils restent libres de dire non.",
    situation:
      "Objection à soulever dans tes propres mots : « Je ne veux pas déranger mes proches », « je n'aime pas mêler mes amis à ça ». Tu insistes une deuxième fois si la réponse est floue ou si le conseiller s'excuse. Tu cèdes seulement s'il te dit que tu as trouvé le rendez-vous utile, que ce serait dommage qu'ils passent à côté, et qu'ils restent libres de dire non. Tu donnes alors 2 prénoms fictifs avec leur lien.",
  },
  {
    id: "reco-sceptique",
    titre: "Le sceptique",
    niveau: "difficile",
    defi: "Il donne 6/10 et garde un doute : traite le feedback avant de demander.",
    situation:
      "Tu donnes 6/10 au rendez-vous et tu as encore un doute (par exemple : « je ne suis pas sûr(e) que ça s'applique à moi » ou « j'ai peur que ça coûte cher »). Si le conseiller enchaîne directement sur les recommandations, tu refuses : « Je ne suis pas assez convaincu(e) pour recommander. » Si, au contraire, il te demande ce qu'il faudrait pour un 10 et traite ton doute, tu remontes à 8/10, tu acceptes et tu donnes 3 prénoms fictifs avec leur lien.",
  },
];

/** Méthode en 7 étapes, donnée au client fictif (pour rester cohérent) et au coach (pour évaluer). */
export const METHODE_RECO = `La méthode de prise de recommandations (7 étapes), en fin de rendez-vous. Le préaccord a été posé EN DÉBUT de rendez-vous.
1. Rappeler le préaccord : « [Prénom], au début de notre rendez-vous, nous nous étions mis d'accord : si notre échange vous apportait de la valeur, vous me présenteriez quelques personnes de votre entourage qui pourraient en profiter aussi. Vous vous en souvenez ? » Attendre le « oui ». À éviter : s'excuser (« désolé de vous demander… »), enchaîner sans attendre la réponse.
2. Recueillir le feedback : « Sur une échelle de 1 à 10, comment avez-vous trouvé notre rendez-vous ? Et qu'est-ce qui vous a le plus apporté aujourd'hui ? » Écouter, reformuler ses mots. Si la note est sous 8 : « Que faudrait-il pour un 10 ? ». À éviter : répondre à sa place, passer en force si un doute est exprimé, se justifier.
3. Expliquer le process : les proches sont d'abord prévenus par un petit message, avant tout appel, pour un meilleur premier contact. Finir par la question de validation (« J'imagine que cela vous arrange aussi que nous procédions ainsi ? ») et attendre le « oui ». À éviter : parler technique ou produit, laisser croire à un appel à froid, rester flou sur la suite.
4. Envoyer le message et le lire ensemble : le client envoie un message court et chaleureux à transférer, qui doit sonner comme lui (« Est-ce qu'il vous ressemble ? Vous voulez changer un mot ? »). Le client peut l'adapter avec ses propres mots.
5. Montrer le geste pour choisir les contacts : en présentiel, demander « iPhone ou Android ? » et montrer le geste (le + ou le trombone dans la conversation, puis « contacts ») ; en ligne, expliquer le geste par écrit ou à l'écran, pas à pas.
6. Guider la réflexion cercle par cercle : famille (« Qui travaille dans votre famille ? »), amis, collègues (« Avec quels collègues vous entendez-vous bien ? »), parents autour de vous, corps médical, indépendants ou entrepreneurs. Puis la question qui ouvre la dernière porte : « À part eux, y a-t-il quelqu'un d'autre à qui cela pourrait rendre service ? »
7. Prévenir les recommandations, comme convenu : « Comme convenu, on les prévient maintenant : vous pouvez envoyer le message ? … Parfait. Je les contacterai dans les prochains jours et je vous tiendrai au courant. Merci pour votre confiance. » Vérifier que le message est bien parti, noter pour chacun le lien, la situation et le bon moment pour appeler. À éviter : laisser le client « l'envoyer plus tard », appeler une recommandation qui n'a pas été prévenue, oublier de faire un retour au client.

Énergie : la recommandation se prend au sommet, pas en descente (posture ouverte, voix posée, silences assumés, aucune hésitation, fierté plutôt que gêne). Professionnalisme : process clair, respect total des proches (toujours prévenus avant tout appel), zéro improvisation, parole tenue.

Réponses aux trois objections les plus fréquentes :
- « Je préfère d'abord leur demander. » : je comprends tout à fait, et c'est justement le rôle du message : il les prévient et leur laisse le choix. À qui l'envoyons-nous en premier ?
- « Je ne connais personne. » : ce n'est pas grave, on y va cercle par cercle ; dans votre famille, qui travaille ?
- « Je ne veux pas déranger mes proches. » : justement, vous avez trouvé ça utile ; ce serait dommage qu'ils passent à côté, non ? Ils restent libres de dire non.`;

export interface CritereReco {
  id: string;
  label: string;
}

/** Grille de la formation (observateur) : les 7 étapes, plus l'énergie et le professionnalisme. Le libellé de l'étape 5 dépend du format. */
export const critereReco = (format: FormatRdv): CritereReco[] => [
  { id: "preaccord", label: "1. Rappel du préaccord" },
  { id: "feedback", label: "2. Feedback du client (note sur 10 et ce qui a apporté)" },
  { id: "process", label: "3. Process expliqué et question de validation" },
  { id: "message", label: "4. Message envoyé et lu ensemble" },
  { id: "geste", label: format === "presentiel" ? "5. iPhone / Android : geste montré" : "5. Geste pour choisir les contacts expliqué pas à pas" },
  { id: "cercles", label: "6. Cercle par cercle et « quelqu'un d'autre ? »" },
  { id: "prevenir", label: "7. Recommandations prévenues, retour promis, remerciement" },
  { id: "energie", label: "Énergie et assurance (pas d'excuses, pas de baisse de régime)" },
  { id: "pro", label: "Professionnalisme et réponse à l'objection" },
];

export const OUVERTURE_RECO = "Voilà, je crois qu'on a fait le tour de tout. Merci beaucoup pour votre temps !";
