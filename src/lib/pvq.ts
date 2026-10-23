import type { DealStage } from "@/types/database";

// Un contrat est « saisi » dès qu'il est signé (hors « Offre en cours »).
// Il est « décompté » quand son premier paiement est confirmé : le collaborateur touche alors dessus.
export const ENTERED_STAGES: DealStage[] = ["Contrat signé", "Apparu en Rennelist", "Décompté", "Non paiement", "Conclue"];
export const PAID_STAGES: DealStage[] = ["Décompté", "Conclue"];
export const PENDING_STAGES: DealStage[] = ["Contrat signé", "Apparu en Rennelist"];

export interface PvqLine {
  deal_stage: DealStage;
  units: number | null;
}

export interface Pvq1 {
  /** Contrats saisis sur le mois de production. */
  entered: number;
  /** Premier paiement confirmé (décomptés). */
  paid: number;
  /** Premier paiement attendu, pas encore vérifié. */
  pending: number;
  /** Premier paiement non effectué. */
  unpaid: number;
  unitsEntered: number;
  unitsPaid: number;
  unitsPending: number;
  /** PVQ1 en contrats : décomptés ÷ saisis (null s'il n'y a rien de saisi). */
  pct: number | null;
  /** PVQ1 en unités. */
  pctUnits: number | null;
}

const u = (n: number | null | undefined) => Number(n) || 0;

/** PVQ1 : parmi les contrats saisis, part de ceux dont le premier paiement a bien été effectué. */
export function pvq1(lines: PvqLine[]): Pvq1 {
  const r: Pvq1 = { entered: 0, paid: 0, pending: 0, unpaid: 0, unitsEntered: 0, unitsPaid: 0, unitsPending: 0, pct: null, pctUnits: null };
  for (const l of lines) {
    if (!ENTERED_STAGES.includes(l.deal_stage)) continue;
    r.entered += 1;
    r.unitsEntered += u(l.units);
    if (PAID_STAGES.includes(l.deal_stage)) {
      r.paid += 1;
      r.unitsPaid += u(l.units);
    } else if (l.deal_stage === "Non paiement") {
      r.unpaid += 1;
    } else {
      r.pending += 1;
      r.unitsPending += u(l.units);
    }
  }
  r.pct = r.entered > 0 ? r.paid / r.entered : null;
  r.pctUnits = r.unitsEntered > 0 ? r.unitsPaid / r.unitsEntered : null;
  return r;
}

export function pctLabel(p: number | null): string {
  return p === null ? "—" : `${Math.round(p * 100)} %`;
}
