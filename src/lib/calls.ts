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
