import { VIE_PRODUCTS } from "@/lib/commission-products";
import type { DealStage } from "@/types/database";

export type CompanyId = "axa" | "vivium" | "dela";

export interface Company {
  id: CompanyId;
  label: string;
  short: string;
  // Valeur stockée dans client_policies.partner — alignée sur KNOWN_PARTNERS
  // (decompte-deadline.ts) pour que les dates limites de décompte restent valides.
  partner: string;
  basis: "monthly" | "capital";
  factor: number;
  amountLabel: string;
  formulaLabel: string;
  products: { code: string; label: string }[];
}

const vieFactor = (id: string) => VIE_PRODUCTS.find((p) => p.id === id)?.factor ?? 0;

// Formules de "Calcul des unités selon les compagnies" :
// AXA = prime mensuelle × 0,912 · Vivium/AG = prime mensuelle × 0,647 ·
// DELA = (capital ÷ 1 000) × 6.
export const COMPANIES: Company[] = [
  {
    id: "axa",
    label: "AXA",
    short: "AXA",
    partner: "AXA Belgium",
    basis: "monthly",
    factor: vieFactor("axa"),
    amountLabel: "Prime mensuelle (€)",
    formulaLabel: "prime mensuelle × 0,912",
    products: [
      { code: "EP", label: "Épargne pension" },
      { code: "ELT", label: "Épargne long terme" },
      { code: "ENF", label: "Épargne enfant" },
      { code: "PLCI", label: "Pension libre complémentaire (PLCI)" },
      { code: "INAMI", label: "Contrat INAMI" },
    ],
  },
  {
    id: "vivium",
    label: "Vivium",
    short: "VIVIUM",
    partner: "P&V Belgique",
    basis: "monthly",
    factor: vieFactor("vivium-ag"),
    amountLabel: "Prime mensuelle (€)",
    formulaLabel: "prime mensuelle × 0,647",
    products: [
      { code: "EP", label: "Épargne pension" },
      { code: "ELT", label: "Épargne long terme" },
      { code: "ENF", label: "Épargne enfant" },
      { code: "PLCI", label: "Pension libre complémentaire (PLCI)" },
      { code: "INAMI", label: "Contrat INAMI" },
    ],
  },
  {
    id: "dela",
    label: "DELA",
    short: "DELA",
    partner: "DELA Belgique",
    basis: "capital",
    factor: vieFactor("dela"),
    amountLabel: "Capital assuré (€)",
    formulaLabel: "(capital ÷ 1 000) × 6",
    products: [{ code: "PPO", label: "Prévoyance obsèques" }],
  },
];

export function companyById(id: CompanyId): Company {
  return COMPANIES.find((c) => c.id === id) ?? COMPANIES[0];
}

export function companyByPartner(partner: string | null): Company | null {
  return COMPANIES.find((c) => c.partner === partner) ?? null;
}

export function computeUnits(company: Company, amount: number): number {
  if (!(amount > 0)) return 0;
  const raw = company.basis === "capital" ? (amount / 1000) * company.factor : amount * company.factor;
  return Math.round(raw * 100) / 100;
}

export const DEAL_STAGES: DealStage[] = [
  "Offre en cours",
  "Contrat signé",
  "Apparu en Rennelist",
  "Décompté",
  "Non paiement",
  "Conclue",
];

export const DEAL_STAGE_COLOR: Record<DealStage, string> = {
  "Offre en cours": "#3d8fe0",
  "Contrat signé": "#8a97b0",
  "Apparu en Rennelist": "#e0b93a",
  "Décompté": "#2fa56f",
  "Non paiement": "#b3543a",
  Conclue: "#1f8158",
};

export const COUNTED_STAGES: DealStage[] = ["Décompté", "Conclue"];

export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  return new Date(`${key}-01`).toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
}
