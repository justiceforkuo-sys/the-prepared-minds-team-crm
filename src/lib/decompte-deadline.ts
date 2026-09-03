const PARTNER_CUTOFF: Record<string, number | "end-of-month"> = {
  "AXA Belgium": 20,
  "P&V Belgique": 20,
  "DELA Belgique": "end-of-month",
};

export const KNOWN_PARTNERS = Object.keys(PARTNER_CUTOFF);

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function cutoffForMonth(partner: string, year: number, month: number): Date | null {
  const rule = PARTNER_CUTOFF[partner];
  if (!rule) return null;
  const day = rule === "end-of-month" ? lastDayOfMonth(year, month) : rule;
  return new Date(year, month, day);
}

export function nextCutoff(partner: string, from: Date = new Date()): Date | null {
  const startOfToday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let cutoff = cutoffForMonth(partner, from.getFullYear(), from.getMonth());
  if (!cutoff) return null;
  if (cutoff < startOfToday) {
    cutoff = cutoffForMonth(partner, from.getFullYear(), from.getMonth() + 1);
  }
  return cutoff;
}

export function payoutDateForCutoff(cutoff: Date): Date {
  return new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 20);
}

export function daysUntilCutoff(partner: string, from: Date = new Date()): number | null {
  const cutoff = nextCutoff(partner, from);
  if (!cutoff) return null;
  const startOfToday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((cutoff.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}
