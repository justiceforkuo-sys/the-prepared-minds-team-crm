// Comptes rendus de rendez-vous : résultats possibles et effet de chaque résultat sur le contact.

export type RdvKind = "prospect" | "candidat";

export const PROSPECT_OUTCOMES = ["Bilan effectué", "Dossier ouvert", "À revoir", "Reporté", "Absent", "Pas intéressé"] as const;
export const CANDIDAT_OUTCOMES = ["Profil retenu", "À revoir", "Reporté", "Absent", "Pas retenu"] as const;

export const OUTCOME_COLOR: Record<string, string> = {
  "Bilan effectué": "#1f8158",
  "Dossier ouvert": "#1f8158",
  "Profil retenu": "#1f8158",
  "À revoir": "#6d3fb8",
  Reporté: "#c99a3f",
  Absent: "#8a97b0",
  "Pas intéressé": "#b3543a",
  "Pas retenu": "#b3543a",
};

export const outcomesFor = (kind: RdvKind): readonly string[] => (kind === "prospect" ? PROSPECT_OUTCOMES : CANDIDAT_OUTCOMES);

/** Étape d'un prospect après le rendez-vous (null = inchangée). */
export function prospectStageAfterRdv(current: string, outcome: string): string | null {
  switch (outcome) {
    case "Bilan effectué":
    case "Dossier ouvert":
      return current === "Entretien / Dossier" ? null : "Entretien / Dossier";
    case "Pas intéressé":
      return current === "Perdu" ? null : "Perdu";
    case "À revoir":
    case "Reporté":
    case "Absent":
      return ["À contacter", "Contacté", "Répondu"].includes(current) ? "RDV pris" : null;
    default:
      return null;
  }
}

export interface RdvReport {
  id: string;
  author_id: string;
  author_name: string;
  happened_on: string;
  outcome: string;
  note: string | null;
  via_voice: boolean;
  next_follow_up: string | null;
  created_at: string;
}
