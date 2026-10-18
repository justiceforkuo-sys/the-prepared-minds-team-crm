import { renderMessage, templateFor, type MessageContext } from "./messages";
import type { LinkedinGroup, LinkedinTemplate, MessageStep, TemplateGroup, TemplateStat } from "./types";

export const G4S_TAG = "ex-collègue G4S";

export type TemplateSource = "perso" | "equipe" | "code";

export interface ResolvedTemplate {
  body: string;
  templateId: string | null;
  source: TemplateSource;
  variant: string;
}

// Cases du tableau « Mes messages » : groupe × étape, plus la réponse commune à tous les groupes.
export const TEMPLATE_CELLS: { grp: TemplateGroup; step: MessageStep }[] = [
  ...(["A", "B", "C", "D"] as const).flatMap((grp) => (["1", "2", "3"] as const).map((step) => ({ grp, step }))),
  { grp: "ALL", step: "reply" },
];

export function cellGroup(grp: LinkedinGroup, step: MessageStep): TemplateGroup | null {
  if (step === "reply") return "ALL";
  return grp === "A" || grp === "B" || grp === "C" || grp === "D" ? grp : null;
}

const find = (list: LinkedinTemplate[], owner: string | null, grp: TemplateGroup, step: MessageStep, variant: string) =>
  list.find((t) => t.owner_id === owner && t.grp === grp && t.step === step && t.variant === variant);

// Ordre : variante G4S perso (groupe D, message 1, étiquette ex-collègue G4S) → ma version →
// modèle d'équipe (base de données) → modèle d'équipe du code.
export function resolveTemplate(
  templates: LinkedinTemplate[],
  ownerId: string,
  grp: LinkedinGroup,
  step: MessageStep,
  tags: string[]
): ResolvedTemplate | null {
  const cell = cellGroup(grp, step);
  if (!cell) return null;

  if (cell === "D" && step === "1" && tags.includes(G4S_TAG)) {
    const g4s = find(templates, ownerId, "D", "1", "g4s");
    if (g4s) return { body: g4s.body, templateId: g4s.id, source: "perso", variant: "g4s" };
  }
  const mine = find(templates, ownerId, cell, step, "default");
  if (mine) return { body: mine.body, templateId: mine.id, source: "perso", variant: "default" };
  const team = find(templates, null, cell, step, "default");
  if (team) return { body: team.body, templateId: team.id, source: "equipe", variant: "default" };
  const code = templateFor(grp, step);
  return code ? { body: code, templateId: null, source: "code", variant: "default" } : null;
}

export function renderResolved(resolved: ResolvedTemplate, ctx: MessageContext): string {
  return renderMessage(resolved.body, ctx);
}

// --- Garde-fous FSMA : on signale sans bloquer.
const RISKY: { label: string; re: RegExp }[] = [
  { label: "rendement", re: /rendement/i },
  { label: "garanti", re: /garanti|garantie|garantit/i },
  { label: "sans risque", re: /sans\s+risque/i },
  { label: "gratuit à vie", re: /gratuit\s+(à|a)\s+vie/i },
  { label: "défiscalisation assurée", re: /d[ée]fiscalisation\s+assur[ée]e/i },
  { label: "100 % sûr", re: /100\s?%\s*(sûr|sur|garanti)/i },
  { label: "placement sûr", re: /placements?\s+s[ûu]rs?/i },
  { label: "rentabilité", re: /rentabilit[ée]/i },
  { label: "taux fixe", re: /taux\s+(fixe|garanti)/i },
];

export function fsmaFlags(text: string): string[] {
  return RISKY.filter((r) => r.re.test(text)).map((r) => r.label);
}

export const FSMA_REMINDER =
  "Pas de promesse de rendement, pas de produit cité, pas de « garanti ». Une vraie question, pas un pitch.";

export const VARIABLES: { token: string; label: string }[] = [
  { token: "{prenom}", label: "Prénom du contact" },
  { token: "{entreprise}", label: "Entreprise" },
  { token: "{poste}", label: "Poste" },
  { token: "{calendly}", label: "Mon lien Calendly" },
  { token: "{mon_prenom}", label: "Mon prénom" },
  { token: "{signature}", label: "Ma signature" },
];

export const PREVIEW_CONTACT = {
  firstName: "Sophie",
  company: "Cabinet Lambert",
  position: "Infirmière indépendante",
};

export function rate(stat: TemplateStat | undefined): number | null {
  if (!stat || stat.sent === 0) return null;
  return Math.round((stat.replies / stat.sent) * 100);
}

export const MIN_SENDS_FOR_COMPARISON = 20;

// Une version peut être proposée comme modèle d'équipe si elle a assez d'envois et fait nettement mieux.
export function isStrongVersion(version: TemplateStat | undefined, team: TemplateStat | undefined): boolean {
  if (!version || version.sent < MIN_SENDS_FOR_COMPARISON) return false;
  const v = rate(version);
  if (v === null) return false;
  const t = team && team.sent >= MIN_SENDS_FOR_COMPARISON ? rate(team) : null;
  return t === null ? v >= 20 : v >= t + 5;
}
