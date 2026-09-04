const FEE_TIERS = [
  { max: 5, fee: 75 },
  { max: 15, fee: 125 },
  { max: 30, fee: 150 },
  { max: 50, fee: 175 },
  { max: 75, fee: 200 },
  { max: Infinity, fee: 225 },
];

export function feeForClientNumber(n: number): number {
  const tier = FEE_TIERS.find((t) => n <= t.max);
  return tier ? tier.fee : FEE_TIERS[FEE_TIERS.length - 1].fee;
}

export function totalApporteurFee(clientCount: number): number {
  let total = 0;
  for (let n = 1; n <= clientCount; n++) {
    total += feeForClientNumber(n);
  }
  return total;
}

export function currentTierLabel(clientCount: number): string {
  if (clientCount === 0) return "Aucun client apporté";
  const fee = feeForClientNumber(clientCount);
  return `${fee} € / client à ce palier`;
}
