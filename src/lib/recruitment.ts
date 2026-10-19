// Recrutement : étapes, options du formulaire de candidature, score, ancienneté.
// Code partagé par le formulaire public, la page Recrutement et la page Aujourd'hui.

export const RECRUITMENT_STATUSES = [
  "Nouveau",
  "Contacté",
  "Entretien planifié",
  "Retenu",
  "Intégré",
  "Actif 90 j",
  "Rejeté",
  "Sans suite",
  "Non éligible",
] as const;
export type RecruitmentStatus = (typeof RECRUITMENT_STATUSES)[number];

/** Étapes du parcours, dans l'ordre ; Rejeté / Sans suite / Non éligible sortent du parcours à tout moment. */
export const PIPELINE_STATUSES: RecruitmentStatus[] = ["Nouveau", "Contacté", "Entretien planifié", "Retenu", "Intégré", "Actif 90 j"];
export const EXIT_STATUSES: RecruitmentStatus[] = ["Rejeté", "Sans suite", "Non éligible"];
/** Statuts où un candidat attend encore une action de son responsable. */
export const OPEN_STATUSES: RecruitmentStatus[] = ["Nouveau", "Contacté", "Entretien planifié", "Retenu"];

export const STATUS_COLOR: Record<RecruitmentStatus, string> = {
  Nouveau: "#5a6b85",
  Contacté: "#1e3a6d",
  "Entretien planifié": "#2f5fa8",
  Retenu: "#3f7d5c",
  Intégré: "#1f8158",
  "Actif 90 j": "#176a47",
  Rejeté: "#b3543a",
  "Sans suite": "#8a97ab",
  "Non éligible": "#b3543a",
};

export interface RecruitmentRow {
  id: string;
  recruiter_id: string | null;
  owner_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  nationality: string | null;
  current_situation: string | null;
  birthdate: string | null;
  has_cess: boolean | null;
  availability_confirmed: boolean | null;
  french_level: string | null;
  english_level: string | null;
  dutch_level: string | null;
  referral_source: string | null;
  eligibility: string | null;
  eligible: boolean | null;
  motivation: string | null;
  hours_per_week: string | null;
  sales_experience: boolean | null;
  sales_experience_note: string | null;
  income_goal: string | null;
  consent_at: string | null;
  score: number | null;
  score_label: ScoreLabel | null;
  next_action: string | null;
  next_action_date: string | null;
  interview_at: string | null;
  status: RecruitmentStatus;
  status_reason: string | null;
  stage_changed_at: string;
  person_id: string | null;
  linkedin_contact_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Options du formulaire (valeur stockée -> libellé affiché)
// ---------------------------------------------------------------------------

export const ELIGIBILITY_OPTIONS = [
  { value: "belge", label: "Je suis de nationalité belge", eligible: true },
  { value: "ue", label: "Je suis ressortissant d'un pays de l'Union européenne", eligible: true },
  { value: "titre_10", label: "Je dispose d'un titre de séjour de plus de 10 ans en Belgique", eligible: true },
  { value: "aucune", label: "Aucune de ces situations", eligible: false },
] as const;

export const SITUATION_OPTIONS = ["Étudiant", "Salarié", "Indépendant", "Demandeur d'emploi", "Autre"] as const;

export const HOURS_OPTIONS = [
  { value: "lt5", label: "Moins de 5 h" },
  { value: "5-10", label: "5 à 10 h" },
  { value: "10-20", label: "10 à 20 h" },
  { value: "full", label: "Temps plein" },
] as const;

export const INCOME_OPTIONS = [
  { value: "lt500", label: "Moins de 500 €" },
  { value: "500-1500", label: "500 à 1 500 €" },
  { value: "1500-3000", label: "1 500 à 3 000 €" },
  { value: "gt3000", label: "Plus de 3 000 €" },
] as const;

export const LEVEL_OPTIONS = ["Débutant", "Intermédiaire", "Courant"] as const;
export const REFERRAL_OPTIONS = ["Un ami", "Réseaux sociaux", "LinkedIn", "Événement", "Autre"] as const;

export const MIN_AGE = 21;

export function labelOf(options: readonly { value: string; label: string }[], value: string | null): string {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

/** Âge entier à une date donnée (par défaut aujourd'hui). Aucune limite maximale : seul un minimum est exigé. */
export function ageOn(birthdate: string, on: Date = new Date()): number {
  const [y, m, d] = birthdate.split("-").map(Number);
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// Score candidat
// ---------------------------------------------------------------------------

export type ScoreLabel = "Fort" | "Moyen" | "À creuser";

export interface ScoreInput {
  motivation: string | null;
  hours_per_week: string | null;
  sales_experience: boolean | null;
  dutch_level: string | null;
  english_level: string | null;
}

/** Motivation ≥ 80 caractères +3 · heures (<5 h 0, 5-10 h +2, 10-20 h +3, temps plein +3) · expérience contact +2 · néerlandais courant +2 · anglais courant +1. */
export function computeScore(c: ScoreInput): { score: number; label: ScoreLabel } {
  let score = 0;
  if ((c.motivation ?? "").trim().length >= 80) score += 3;
  score += { lt5: 0, "5-10": 2, "10-20": 3, full: 3 }[c.hours_per_week ?? ""] ?? 0;
  if (c.sales_experience) score += 2;
  if (c.dutch_level === "Courant") score += 2;
  if (c.english_level === "Courant") score += 1;
  const label: ScoreLabel = score >= 8 ? "Fort" : score >= 5 ? "Moyen" : "À creuser";
  return { score, label };
}

export const SCORE_COLOR: Record<ScoreLabel, string> = { Fort: "#3f7d5c", Moyen: "#c99a3f", "À creuser": "#b3543a" };
export const SCORE_TAG: Record<ScoreLabel, string> = { Fort: "Profil fort", Moyen: "Profil moyen", "À creuser": "À creuser" };

// ---------------------------------------------------------------------------
// Ancienneté : règle d'or = premier contact sous 24-48 h
// ---------------------------------------------------------------------------

export function hoursSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 3600000));
}

export function waitingLabel(iso: string, now: Date = new Date()): string {
  const h = hoursSince(iso, now);
  return h < 24 ? `${h} h` : `${Math.floor(h / 24)} j`;
}

/** Couleur de l'ancienneté d'un candidat « Nouveau » : neutre < 24 h, orange après 24 h, rouge après 48 h. */
export function waitingTone(iso: string, now: Date = new Date()): "ok" | "warn" | "late" {
  const h = hoursSince(iso, now);
  return h >= 48 ? "late" : h >= 24 ? "warn" : "ok";
}

/** Candidat à rappeler : « Nouveau » depuis plus de 24 h, ou prochaine action arrivée à échéance. */
export function needsCallback(
  c: Pick<RecruitmentRow, "status" | "created_at" | "next_action_date">,
  today: string,
  now: Date = new Date()
): boolean {
  if (!(OPEN_STATUSES as string[]).includes(c.status)) return false;
  if (c.next_action_date && c.next_action_date <= today) return true;
  return c.status === "Nouveau" && hoursSince(c.created_at, now) >= 24;
}

export const TOO_YOUNG_MESSAGE = "Merci ! Pour rejoindre l'équipe, il faut avoir au moins 21 ans. On reste en contact avec plaisir.";
export const NOT_ELIGIBLE_MESSAGE =
  "Merci pour ton intérêt ! Pour rejoindre l'équipe, il faut être de nationalité belge ou européenne, ou disposer d'un titre de séjour de plus de 10 ans en Belgique. On reste en contact avec plaisir.";
