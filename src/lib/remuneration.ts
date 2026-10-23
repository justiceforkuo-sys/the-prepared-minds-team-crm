import type { Person } from "@/types/database";

// Rémunération des collaborateurs démarrés à partir du 1er septembre 2025 (bloc 6).
// Apporteur d'affaires avant l'agrément FSMA (forfait par client), puis sous-agent OVB Willemot
// (unités × valeur du point du rang à la souscription) avec un rattrapage calculé une seule fois.
export const REMU_START = "2025-09-01";

export type RemuFields = { date_demarrage: string | null; agrement_fsma_at: string | null };
export const remuOf = (p: Person) => p as Person & Partial<RemuFields>;
/** Ce type de paiement ne concerne que FT1 à FT3 (JFA I, II, III) : il n'affecte pas le rang FA et au-dessus. */
export const REMU_RANKS = ["JFAI", "JFAII", "JFAIII"];
export function isRemuConcerned(p: Person): boolean {
  const d = remuOf(p).date_demarrage;
  return !!d && d >= REMU_START && REMU_RANKS.includes(p.rank);
}

export interface BaremeRow {
  id?: number;
  rang_min: number;
  rang_max: number | null;
  montant: number;
  date_effet: string;
}

// Valeurs d'origine : repli si la table n'est pas lisible (le barème réel vit dans bareme_forfait_client)
export const DEFAULT_BAREME: BaremeRow[] = [
  { rang_min: 1, rang_max: 5, montant: 75, date_effet: REMU_START },
  { rang_min: 6, rang_max: 15, montant: 125, date_effet: REMU_START },
  { rang_min: 16, rang_max: 30, montant: 150, date_effet: REMU_START },
  { rang_min: 31, rang_max: 50, montant: 175, date_effet: REMU_START },
  { rang_min: 51, rang_max: 75, montant: 200, date_effet: REMU_START },
  { rang_min: 76, rang_max: null, montant: 225, date_effet: REMU_START },
];

/** Tranches en vigueur à une date : pour chaque rang_min, la ligne dont la date d'effet est la plus récente (<= at). */
export function tiersAt(bareme: BaremeRow[], at: string = new Date().toISOString().slice(0, 10)): BaremeRow[] {
  const byMin = new Map<number, BaremeRow>();
  for (const row of bareme) {
    if (row.date_effet > at) continue;
    const cur = byMin.get(row.rang_min);
    if (!cur || row.date_effet > cur.date_effet) byMin.set(row.rang_min, row);
  }
  return [...byMin.values()].sort((a, b) => a.rang_min - b.rang_min);
}

export function forfaitForRank(n: number, bareme: BaremeRow[], at?: string): number {
  const tiers = tiersAt(bareme.length ? bareme : DEFAULT_BAREME, at);
  const t = tiers.find((x) => n >= x.rang_min && (x.rang_max === null || n <= x.rang_max));
  return t ? Number(t.montant) : 0;
}

export interface TierInfo {
  nextAmount: number;
  /** Clients encore rémunérés à ce montant avant le palier suivant (null = dernier palier). */
  remainingAtAmount: number | null;
  nextTierAmount: number | null;
}

/** Après `count` clients : montant du prochain client et distance jusqu'au palier suivant. */
export function tierInfo(count: number, bareme: BaremeRow[], at?: string): TierInfo {
  const tiers = tiersAt(bareme.length ? bareme : DEFAULT_BAREME, at);
  const next = count + 1;
  const cur = tiers.find((x) => next >= x.rang_min && (x.rang_max === null || next <= x.rang_max));
  if (!cur) return { nextAmount: 0, remainingAtAmount: null, nextTierAmount: null };
  const after = cur.rang_max === null ? null : tiers.find((x) => x.rang_min === (cur.rang_max as number) + 1);
  return {
    nextAmount: Number(cur.montant),
    remainingAtAmount: cur.rang_max === null ? null : cur.rang_max - count,
    nextTierAmount: after ? Number(after.montant) : null,
  };
}

/** Montant en euros, avec décimales seulement si nécessaire (le rattrapage peut avoir des centimes). */
export function eur(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const RANK_FT: Record<string, string> ={ JFAI: "FT1", JFAII: "FT2", JFAIII: "FT3" };
export function rankLabel(code: string): string {
  return RANK_FT[code] ? `${RANK_FT[code]} (${code.replace("JFA", "JFA ")})` : code;
}

export interface ForfaitRow {
  client_id: string;
  client_name: string | null;
  rang_client: number;
  montant: number;
  signe_le: string;
  paye_le: string | null;
}

export interface RattrapageRow {
  user_id: string;
  calcule_le: string;
  valeur_unites: number;
  forfaits_payes: number;
  montant: number;
  verse_le: string | null;
  note: string | null;
}

export interface RemuSummary {
  bareme: BaremeRow[];
  forfaits: ForfaitRow[];
  forfaitsTotal: number;
  forfaitsPayes: number;
  rattrapage: RattrapageRow | null;
  /** Valeur des unités mises de côté (apporteur) : Σ unités × valeur du point à la souscription. */
  reserve: number;
  /** Valeur des unités payées (sous-agent). */
  unitsPaidValue: number;
  unitsTotal: number;
  /** Ce que vaudrait le rattrapage si l'agrément était obtenu aujourd'hui : max(0, réserve − forfaits). */
  rattrapageEstime: number;
  /** Nombre de clients rémunérés (calculé, ou encodé à la main). */
  clientsCount: number;
  /** Valeurs encodées à la main par l'administrateur (elles remplacent le calcul automatique). */
  manuel: RemuManuel | null;
}

export interface RemuManuel {
  nb_clients: number;
  forfaits_total: number;
  forfaits_payes: number;
  unites: number;
  reserve: number;
  rattrapage: number | null;
  note: string | null;
}
