export type PeriodKind = "semaine" | "mois" | "trimestre";

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function mondayOf(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

export function rangeFor(kind: PeriodKind, anchor: Date): DateRange {
  if (kind === "semaine") {
    const start = mondayOf(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
    return { start: toISO(start), end: toISO(end), label: `Semaine du ${fmt(start)} au ${fmt(end)}` };
  }
  if (kind === "mois") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return {
      start: toISO(start),
      end: toISO(end),
      label: start.toLocaleDateString("fr-BE", { month: "long", year: "numeric" }),
    };
  }
  const q = Math.floor(anchor.getMonth() / 3);
  const start = new Date(anchor.getFullYear(), q * 3, 1);
  const end = new Date(anchor.getFullYear(), q * 3 + 3, 0);
  return { start: toISO(start), end: toISO(end), label: `T${q + 1} ${anchor.getFullYear()}` };
}

export function shiftAnchor(kind: PeriodKind, anchor: Date, delta: number): Date {
  const d = new Date(anchor);
  if (kind === "semaine") d.setDate(d.getDate() + delta * 7);
  else if (kind === "mois") d.setMonth(d.getMonth() + delta, 1);
  else d.setMonth(d.getMonth() + delta * 3, 1);
  return d;
}

export interface MonthProgress {
  daysElapsed: number;
  daysInMonth: number;
  daysLeft: number;
  weeksLeft: number;
}

export function monthProgress(today: Date): MonthProgress {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysElapsed = today.getDate();
  const daysLeft = daysInMonth - daysElapsed;
  return { daysElapsed, daysInMonth, daysLeft, weeksLeft: Math.max(1, Math.ceil(daysLeft / 7)) };
}

export function projectEndOfMonth(realised: number, progress: MonthProgress): number {
  if (progress.daysElapsed <= 0) return realised;
  return (realised / progress.daysElapsed) * progress.daysInMonth;
}

// Ratios OVB : 1 DV réalisé sur 2 planifiés, 1 signature sur 3 DV réalisés,
// ~100 unités par client, 1 dossier recruté pour 25 DR planifiés.
export const OVB_RATIOS = { planToReal: 2, realToSign: 3, unitsPerClient: 100, drPerDossier: 25 };

export interface StatProjection {
  clientsToSign: number;
  dvRealises: number;
  dvPlanifies: number;
  drPlanifies: number;
  perWeek: { dvPlanifies: number; dvRealises: number; units: number; clients: number; drPlanifies: number; recrues: number };
}

export function statProjection(remainingUnits: number, remainingRecrues: number, weeksLeft: number): StatProjection {
  const units = Math.max(0, remainingUnits);
  const recrues = Math.max(0, remainingRecrues);
  const clientsToSign = units / OVB_RATIOS.unitsPerClient;
  const dvRealises = clientsToSign * OVB_RATIOS.realToSign;
  const dvPlanifies = dvRealises * OVB_RATIOS.planToReal;
  const drPlanifies = recrues * OVB_RATIOS.drPerDossier;
  const w = Math.max(1, weeksLeft);
  return {
    clientsToSign,
    dvRealises,
    dvPlanifies,
    drPlanifies,
    perWeek: {
      dvPlanifies: dvPlanifies / w,
      dvRealises: dvRealises / w,
      units: units / w,
      clients: clientsToSign / w,
      drPlanifies: drPlanifies / w,
      recrues: recrues / w,
    },
  };
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
}
