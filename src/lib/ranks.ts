import type { Rank } from "@/types/database";

export interface RankInfo {
  code: Rank;
  label: string;
  unitValue: number;
  next: { label: string } | null;
}

export const RANKS_INFO: RankInfo[] = [
  {
    code: "JFAI",
    label: "Junior Financial Advisor I",
    unitValue: 1.5,
    next: { label: "1 000 pts de production historique personnelle" },
  },
  {
    code: "JFAII",
    label: "Junior Financial Advisor II",
    unitValue: 2.0,
    next: { label: "3 000 pts de production historique personnelle" },
  },
  {
    code: "JFAIII",
    label: "Junior Financial Advisor III",
    unitValue: 2.5,
    next: {
      label: "4 000 pts perso + 3 JFA II directs (300 pts chacun le trimestre précédent) — ou séminaire chance",
    },
  },
  {
    code: "FA",
    label: "Financial Advisor",
    unitValue: 3.5,
    next: {
      label: "6 000 pts perso + 9 000 pts production équipe/trim (2 trim consécutifs) + 3 FA directs (ou 2 JFA II par FA)",
    },
  },
  {
    code: "FC",
    label: "Financial Consultant",
    unitValue: 4.5,
    next: {
      label: "9 000 pts perso + 25 000 pts équipe/trim (2 trim consécutifs) + 6 FA directs (ou 12 JFA II)",
    },
  },
  {
    code: "CD",
    label: "Coordinateur Départemental",
    unitValue: 5.0,
    next: { label: "60 000 pts équipe/trim (2 trim consécutifs) + 4 FC directs (ou 3 FA)" },
  },
  {
    code: "CR",
    label: "Coordinateur Régional",
    unitValue: 5.5,
    next: { label: "120 000 pts équipe/trim (2 trim consécutifs) + 4 CD directs (ou 6 FC)" },
  },
  { code: "CN", label: "Coordinateur National", unitValue: 6.0, next: null },
];

export function nextRank(code: Rank): RankInfo | null {
  const idx = RANKS_INFO.findIndex((r) => r.code === code);
  return idx >= 0 && idx < RANKS_INFO.length - 1 ? RANKS_INFO[idx + 1] : null;
}

export function unitValue(code: Rank): number {
  return RANKS_INFO.find((r) => r.code === code)?.unitValue ?? 0;
}

export function overrideValue(myRank: Rank, theirRank: Rank, theirUnits: number): number {
  return Math.max(0, unitValue(myRank) - unitValue(theirRank)) * theirUnits;
}
