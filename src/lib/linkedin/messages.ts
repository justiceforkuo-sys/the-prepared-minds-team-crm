import type { LinkedinGroup, MessageStep } from "./types";

type TemplateGroup = "A" | "B" | "C" | "D";

// Modèles d'équipe. Variables : {prenom} {entreprise} {calendly} {prenom_collab} {signature}
export const TEAM_TEMPLATES: Record<TemplateGroup, Record<"1" | "2" | "3", string>> = {
  A: {
    "1": `Bonjour {prenom},

Merci pour la connexion. J'accompagne des soignants, salariés et indépendants, sur leur protection sociale et leur pension, et je travaille déjà avec une structure infirmière en Wallonie.

Une question simple : chez {entreprise}, est-ce que vos équipes vous parlent de ces sujets (arrêt maladie, pension, statut complémentaire), ou c'est totalement absent du quotidien ?

Belle journée,
{prenom_collab}`,
    "2": `Bonjour {prenom},

Je reviens vers vous avec une proposition concrète, au cas où elle puisse servir {entreprise} :

• Un atelier d'information d'une heure pour vos équipes : « Ce que je touche vraiment si je m'arrête, et comment préparer ma pension ». Gratuit, sans vente.
• Un bilan financier offert aux membres de l'équipe qui le souhaitent.
• Aucune charge pour vous : vous faites le lien, je m'occupe du reste.

Si ça vous parle, 15 minutes au téléphone suffisent pour voir si c'est pertinent.

{signature}`,
    "3": `Bonjour {prenom},

Je ne veux pas encombrer votre messagerie, donc c'est mon dernier message. Si un jour la question de la protection de vos équipes se pose, je reste disponible. Et si ce n'est pas le moment, aucun souci.

Belle continuation,
{prenom_collab}`,
  },
  B: {
    "1": `Bonjour {prenom},

Merci pour la connexion. Je travaille beaucoup avec des infirmiers et des aides-soignants, et une question revient souvent : « Si je m'arrête 3 mois, je touche combien ? » Très peu de gens connaissent la réponse.

Vous, vous la connaissez pour votre situation ?

Belle journée,
{prenom_collab}`,
    "2": `Bonjour {prenom},

Je me permets de revenir vers vous. Si vous voulez y voir clair sur votre situation (arrêt de travail, pension, impôts), je propose un bilan gratuit de 30 minutes, sans engagement et sans rien à acheter.

Vous pouvez choisir un moment ici : {calendly}

{signature}`,
    "3": `Bonjour {prenom},

Dernier petit message de ma part pour ne pas vous déranger. Si un jour vous avez une question sur votre protection ou votre pension, n'hésitez pas : je réponds toujours avec plaisir.

Belle continuation,
{prenom_collab}`,
  },
  C: {
    "1": `Bonjour {prenom},

Merci pour la connexion. Je suis conseiller financier pour les indépendants et les professions de santé (OVB Willemot). Dans votre métier, vous croisez sûrement des clients qui ont besoin de structurer leur protection ou leur fiscalité. Et moi, je croise des clients qui ont besoin de vos services.

Ça vous dirait d'échanger 15 minutes pour voir si on peut se recommander mutuellement ?

{prenom_collab}`,
    "2": `Bonjour {prenom},

Je reviens vers vous pour mon idée d'échange de recommandations. Concrètement : quand un de mes clients a besoin de quelqu'un comme vous chez {entreprise}, je pense à vous, et inversement. Aucun engagement, juste deux professionnels qui se font confiance.

Un café ou un appel de 15 minutes cette semaine ou la suivante ?

{signature}`,
    "3": `Bonjour {prenom},

Dernier message pour ne pas insister. Si un jour un de vos clients a une question sur sa protection ou sa pension, je serai content de l'aider, et de vous renvoyer l'ascenseur.

Belle continuation,
{prenom_collab}`,
  },
  D: {
    "1": `Salut {prenom},

Merci pour la connexion ! Je développe une équipe dans le conseil financier pour indépendants (Prepared Minds Team, sous OVB). Je cherche des personnes qui aiment le contact et qui veulent construire quelque chose sur le long terme.

Tu es ouvert(e) à de nouvelles perspectives en ce moment, ou tu es bien où tu es ?

{prenom_collab}`,
    "2": `Salut {prenom},

Pour être clair sur ce que je propose : une formation complète, un accompagnement par l'équipe, et la possibilité de construire ton propre portefeuille de clients, à ton rythme pour commencer.

Si ça t'intrigue, on en parle 15 minutes, sans engagement : {calendly}

{prenom_collab}`,
    "3": `Salut {prenom},

Dernier message, promis ! Si ce n'est pas pour toi, aucun souci, dis-le-moi simplement. Et si un jour tu as envie de changer d'air, ma porte reste ouverte.

Bonne continuation,
{prenom_collab}`,
  },
};

export const REPLY_TEMPLATE = `Merci pour votre réponse, {prenom} !

[Rebondis sur ce qu'il ou elle t'a dit, en une ou deux phrases.]

Le plus simple serait d'en parler 15 minutes de vive voix. Vous pouvez choisir un moment ici : {calendly}

{prenom_collab}`;

export const CALENDLY_PLACEHOLDER = "[ajoute ton lien Calendly]";

function capitalizeName(s: string): string {
  return s
    .trim()
    .split(/\s+/)[0]
    .split("-")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join("-");
}

// "Mensah, Abraham" -> "Abraham Mensah" ; "Justice Forkuo" reste tel quel
export function displayName(name: string): string {
  if (name.includes(",")) {
    const [last, first] = name.split(",").map((p) => p.trim());
    return `${first} ${last}`.trim();
  }
  return name.trim();
}

export interface MessageContext {
  firstName: string;
  company: string | null;
  position?: string | null;
  grp: LinkedinGroup;
  collaboratorName: string;
  calendlyUrl: string | null;
}

export function templateFor(grp: LinkedinGroup, step: MessageStep): string | null {
  if (step === "reply") return REPLY_TEMPLATE;
  if (grp === "A" || grp === "B" || grp === "C" || grp === "D") return TEAM_TEMPLATES[grp][step];
  return null;
}

export function renderMessage(template: string, ctx: MessageContext): string {
  const me = displayName(ctx.collaboratorName);
  const myFirst = capitalizeName(me);
  const company = ctx.company?.trim();
  const companyFallback = ctx.grp === "C" ? "vous" : "votre structure";
  const vars: Record<string, string> = {
    prenom: capitalizeName(ctx.firstName),
    entreprise: company || companyFallback,
    calendly: ctx.calendlyUrl?.trim() || CALENDLY_PLACEHOLDER,
    prenom_collab: myFirst,
    mon_prenom: myFirst,
    poste: ctx.position?.trim() || "votre métier",
    signature: `${me}\nPrepared Minds Team, sous-agent OVB Willemot`,
  };
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? vars[key] : m));
}
