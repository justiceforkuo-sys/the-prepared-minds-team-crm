import { DEFAULT_BAREME, forfaitForRank, type BaremeRow } from "@/lib/remuneration";

// Barème du contrat d'apporteur : désormais une table de paramètres (bareme_forfait_client, modifiable
// par l'admin). Les valeurs d'origine ne servent plus que de repli si la table n'est pas lisible.
export function feeForClientNumber(n: number, bareme: BaremeRow[] = DEFAULT_BAREME): number {
  return forfaitForRank(n, bareme);
}

export function totalApporteurFee(clientCount: number, bareme: BaremeRow[] = DEFAULT_BAREME): number {
  let total = 0;
  for (let n = 1; n <= clientCount; n++) {
    total += feeForClientNumber(n, bareme);
  }
  return total;
}

export function currentTierLabel(clientCount: number, bareme: BaremeRow[] = DEFAULT_BAREME): string {
  if (clientCount === 0) return "Aucun client apporté";
  const fee = feeForClientNumber(clientCount, bareme);
  return `${fee} € / client à ce palier`;
}
