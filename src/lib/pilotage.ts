export type PeriodKind = "semaine" | "mois" | "trimestre";

// Le serveur (Vercel) tourne en UTC : on lit l'heure murale belge pour que
// "aujourd'hui" ne soit pas la veille entre minuit et 2 h.
export function brusselsNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
}

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

// --- "Mois" de production = période OVB (même règle que ovb_period_for_date en
// SQL) : la dernière période dont la date de début est passée ; sans période
// configurée, retombe sur le mois calendaire. Une période sans successeur reste
// ouverte tant que l'admin n'a pas configuré la suivante.
export interface OvbPeriodLite {
  period_month: string;
  start_date: string;
}

export interface ProductionPeriod {
  key: string;
  start: string;
  end: string;
  label: string;
  openEnded: boolean;
  estimatedEnd: string;
}

const FAR_FUTURE = "2099-12-31";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function buildPeriod(sorted: OvbPeriodLite[], idx: number): ProductionPeriod {
  const p = sorted[idx];
  const next = sorted[idx + 1];
  const start = parseISO(p.start_date);
  const estimatedEnd = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate() - 1);
  let end = FAR_FUTURE;
  if (next) {
    const e = parseISO(next.start_date);
    e.setDate(e.getDate() - 1);
    end = toISO(e);
  }
  const fmt = (d: Date) => d.toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
  const monthName = cap(new Date(`${p.period_month}-01`).toLocaleDateString("fr-BE", { month: "long", year: "numeric" }));
  return {
    key: p.period_month,
    start: p.start_date,
    end,
    label: `${monthName} (du ${fmt(start)}${next ? ` au ${fmt(parseISO(end))}` : ""})`,
    openEnded: !next,
    estimatedEnd: toISO(estimatedEnd),
  };
}

function calendarPeriod(date: Date): ProductionPeriod {
  const r = rangeFor("mois", date);
  return { key: r.start.slice(0, 7), start: r.start, end: r.end, label: cap(r.label), openEnded: false, estimatedEnd: r.end };
}

export function productionPeriodFor(periods: OvbPeriodLite[], date: Date): ProductionPeriod {
  const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const iso = toISO(date);
  let idx = -1;
  sorted.forEach((p, i) => {
    if (p.start_date <= iso) idx = i;
  });
  return idx >= 0 ? buildPeriod(sorted, idx) : calendarPeriod(date);
}

export function adjacentPeriod(periods: OvbPeriodLite[], key: string, delta: number): ProductionPeriod | null {
  const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const idx = sorted.findIndex((p) => p.period_month === key);
  const target = idx + delta;
  if (idx < 0 || target < 0 || target >= sorted.length) return null;
  return buildPeriod(sorted, target);
}

export interface MonthProgress {
  daysElapsed: number;
  daysInMonth: number;
  daysLeft: number;
  weeksLeft: number;
  // vrai si la période est ouverte et déjà dépassée : l'admin doit configurer la suivante
  stale: boolean;
}

export function periodProgress(period: ProductionPeriod, today: Date): MonthProgress {
  const DAY = 86400000;
  const start = parseISO(period.start);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysElapsed = Math.max(1, Math.round((t.getTime() - start.getTime()) / DAY) + 1);
  const endDate = parseISO(period.openEnded ? period.estimatedEnd : period.end);
  const plannedDays = Math.round((endDate.getTime() - start.getTime()) / DAY) + 1;
  const stale = period.openEnded && daysElapsed > plannedDays;
  const daysInMonth = Math.max(plannedDays, daysElapsed);
  const daysLeft = daysInMonth - daysElapsed;
  return { daysElapsed, daysInMonth, daysLeft, weeksLeft: Math.max(1, Math.ceil(daysLeft / 7)), stale };
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
