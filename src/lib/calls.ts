// Suivi des appels : résultats possibles et effet de chaque résultat sur l'étape du prospect.

export const CALL_OUTCOMES = ["Répondu", "Pas de réponse", "Messagerie", "À rappeler", "RDV pris", "Pas intéressé", "Mauvais numéro"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

/** Appel « joint » : la personne a décroché. */
export const REACHED: CallOutcome[] = ["Répondu", "RDV pris", "Pas intéressé", "À rappeler"];

export const OUTCOME_COLOR: Record<CallOutcome, string> = {
  Répondu: "#1f8158",
  "RDV pris": "#c99a3f",
  "À rappeler": "#6d3fb8",
  "Pas de réponse": "#8a97b0",
  Messagerie: "#8a97b0",
  "Pas intéressé": "#b3543a",
  "Mauvais numéro": "#b3543a",
};

const EARLY = ["À contacter", "Contacté"];

/** Nouvelle étape du prospect après un appel (null = inchangée). On ne fait jamais reculer un prospect déjà avancé. */
export function stageAfterCall(current: string, outcome: CallOutcome): string | null {
  switch (outcome) {
    case "Pas intéressé":
    case "Mauvais numéro":
      return current === "Perdu" ? null : "Perdu";
    case "RDV pris":
      return ["RDV pris", "Entretien / Dossier"].includes(current) ? null : "RDV pris";
    case "Répondu":
      return EARLY.includes(current) ? "Répondu" : null;
    default:
      return current === "À contacter" ? "Contacté" : null;
  }
}

// ---------------------------------------------------------------------------
// Bloc 10 : entonnoir des appels (appels passés → joints → RDV fixés) et lecture
// ---------------------------------------------------------------------------

/** Appels qui valent un RDV fixé. */
export const RDV_FIXE: CallOutcome[] = ["RDV pris"];

/** Après ces résultats (appel joint, sans RDV), on demande l'objection entendue. */
export const ASK_OBJECTION: CallOutcome[] = ["Répondu", "Pas intéressé", "À rappeler"];

export interface Seuils {
  /** appels minimum par semaine */
  volume_semaine: number;
  /** part minimale de RDV fixés parmi les appels joints (0,2 = 20 %) */
  taux_rdv_joints: number;
  /** en dessous de ce nombre d'appels sur les 4 dernières semaines, on ne juge pas encore */
  min_appels: number;
}

export const SEUILS_DEFAUT: Seuils = { volume_semaine: 50, taux_rdv_joints: 0.2, min_appels: 30 };

export function parseSeuils(v: unknown): Seuils {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const num = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : d);
  return {
    volume_semaine: num(o.volume_semaine, SEUILS_DEFAUT.volume_semaine),
    taux_rdv_joints: Math.min(1, num(o.taux_rdv_joints, SEUILS_DEFAUT.taux_rdv_joints)),
    min_appels: num(o.min_appels, SEUILS_DEFAUT.min_appels),
  };
}

export interface Funnel {
  appels: number;
  joints: number;
  rdv: number;
}

export const emptyFunnel = (): Funnel => ({ appels: 0, joints: 0, rdv: 0 });

export function addCall(f: Funnel, outcome: string): void {
  f.appels += 1;
  if ((REACHED as string[]).includes(outcome)) f.joints += 1;
  if ((RDV_FIXE as string[]).includes(outcome)) f.rdv += 1;
}

export type LectureKind = "trop_tot" | "volume" | "script" | "bon";
export interface Lecture {
  kind: LectureKind;
  text: string;
}

/**
 * Lecture de l'entonnoir sur les 4 dernières semaines. Le volume d'abord, la qualité ensuite :
 * peu d'appels → « Augmente le volume » ; beaucoup d'appels mais peu de RDV → « Revois le script ».
 */
export function lecture(f: Funnel, weeks: number, s: Seuils): Lecture {
  if (f.appels < s.min_appels) return { kind: "trop_tot", text: `Trop tôt pour conclure : ${f.appels} appel${f.appels > 1 ? "s" : ""} sur 4 semaines (il en faut ${s.min_appels} pour lire tes taux). Continue d'appeler.` };
  const parSemaine = f.appels / Math.max(1, weeks);
  if (parSemaine < s.volume_semaine) return { kind: "volume", text: `Augmente le volume : ${Math.round(parSemaine)} appels par semaine en moyenne, pour un minimum de ${s.volume_semaine}. Le volume d'abord, la qualité ensuite.` };
  const taux = f.joints > 0 ? f.rdv / f.joints : 0;
  if (taux < s.taux_rdv_joints) return { kind: "script", text: `Revois le script : ${Math.round(taux * 100)} % de RDV fixés parmi les appels joints, pour un minimum de ${Math.round(s.taux_rdv_joints * 100)} %.` };
  return { kind: "bon", text: `Bon rythme : ${Math.round(parSemaine)} appels par semaine et ${Math.round(taux * 100)} % de RDV parmi les appels joints. Continue.` };
}
