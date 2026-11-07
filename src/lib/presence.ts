// Présence en ligne et temps passé (migration 055).

/** Une personne est « en ligne » si son dernier signal date de moins de 100 s (signal toutes les 30 s). */
export const ONLINE_WINDOW_SECONDS = 100;

/** 3725 s → « 1 h 02 » ; 540 s → « 9 min » ; 0 → « — ». */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? "< 1 min" : "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** « il y a 5 min », « il y a 3 h », « il y a 2 j » à partir d'un horodatage ISO. */
export function sinceLabel(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 90) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

/** Heure actuelle (ms) ; isolée ici pour garder les pages serveur « pures » aux yeux du linter. */
export const currentTimeMs = () => Date.now();
