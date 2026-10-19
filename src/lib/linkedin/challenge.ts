// Défi LinkedIn : types, badges et petites règles partagées (client + serveur, sans secret).

export interface ChallengeSummary {
  joined: boolean;
  active: boolean;
  ritual_time: string; // "08:00:00"
  email_daily: boolean;
  buddy_id: string | null;
  streak: number;
  points_week: number;
  points_prev_week: number;
  points_total: number;
  today_actions: number;
  goal_label: string | null;
  goal_target: number | null;
  goal_start: string | null;
  goal_end: string | null;
  goal_reward: string | null;
  team_rdv: number;
  buddy_name: string | null;
  buddy_streak: number | null;
  buddy_points_week: number | null;
  buddy_last_action: string | null;
  buddy_idle_days: number | null;
}

export interface PodiumRow {
  rank: number;
  person_name: string;
  points: number;
  kind: "semaine" | "progression";
}

export interface TeamOverviewRow {
  person_id: string;
  person_name: string;
  points_week: number;
  streak: number;
  last_action: string | null;
  active: boolean;
}

export interface WinRow {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export const BADGES: { code: string; icon: string; label: string; help: string }[] = [
  { code: "premier_pas", icon: "👣", label: "Premier pas", help: "Ton premier message envoyé" },
  { code: "premiere_reponse", icon: "💬", label: "Première réponse", help: "Quelqu'un t'a répondu" },
  { code: "premier_rdv", icon: "📅", label: "Premier RDV", help: "Un premier rendez-vous fixé grâce à LinkedIn" },
  { code: "serie_5", icon: "🔥", label: "Série de 5", help: "5 jours ouvrés d'affilée à 5 messages ou plus" },
  { code: "serie_20", icon: "🏔️", label: "Série de 20", help: "20 jours ouvrés d'affilée" },
  { code: "domino", icon: "🀄", label: "Effet domino", help: "Un contact du groupe A (prescripteurs de santé) devenu client ou partenaire" },
  { code: "sans_pitch", icon: "🎯", label: "Sans pitch", help: "5 réponses à ton premier message, sans avoir rien vendu" },
  { code: "plume_or", icon: "🪶", label: "Plume d'or", help: "Ta version d'un message a été adoptée par l'équipe" },
];

export const BADGE_BY_CODE = Object.fromEntries(BADGES.map((b) => [b.code, b]));

// Une phrase du jour, qui tourne : la même pour tout le monde un jour donné.
const PHRASES = [
  "Un message envoyé vaut mieux que dix brouillons.",
  "Tu ne vends rien ce matin : tu poses une vraie question.",
  "La régularité bat l'inspiration. Cinq messages, c'est tout.",
  "Chaque réponse commence par quelqu'un qui a osé écrire en premier.",
  "Sois curieux de l'autre, le reste suivra.",
  "Les relances font la moitié des rendez-vous. Ne les saute pas.",
  "Petit message, grande conséquence : envoie-le.",
  "Aujourd'hui, une seule conversation de qualité suffit à changer ta semaine.",
  "On ne rate pas un message envoyé, on apprend avec lui.",
  "Ta série tient à cinq messages. Tu les as déjà dans la tête.",
];

export function phraseOfTheDay(dayIndex: number): string {
  return PHRASES[((dayIndex % PHRASES.length) + PHRASES.length) % PHRASES.length];
}

export function dayIndexFromIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function celebrationMessage(firstName: string): string {
  return `🔥 ${firstName} vient de décrocher un RDV grâce à LinkedIn. Qui est le prochain ?`;
}

export function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** Heure d'envoi du mail = 15 min avant le rituel. Renvoie des minutes depuis minuit. */
export function emailMinuteFor(ritualTime: string): number {
  const [h, m] = ritualTime.split(":").map(Number);
  return Math.max(0, h * 60 + m - 15);
}
