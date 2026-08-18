export interface OnboardingStep {
  id: string;
  timeframe: string;
  label: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "vision", timeframe: "Jour 1", label: "Écrire sa vision et son « pourquoi »" },
  { id: "sponsor_meet", timeframe: "Jour 1", label: "Premier point d'accompagnement avec son sponsor" },
  { id: "list20", timeframe: "Jour 1-2", label: "Lister au moins 20 contacts potentiels dans Prospects" },
  { id: "scripts", timeframe: "Jour 2-3", label: "Lire et s'entraîner sur les scripts d'invitation" },
  { id: "first_calls", timeframe: "Semaine 1", label: "Réaliser ses 3 premiers appels de prospection" },
  { id: "first_meeting", timeframe: "Semaine 1", label: "Planifier son premier rendez-vous" },
  { id: "training", timeframe: "Semaine 1", label: "Assister à une formation ou un événement d'équipe" },
  { id: "first_deal", timeframe: "Semaine 2", label: "Conclure sa première affaire" },
  { id: "monthly_review", timeframe: "Mois 1", label: "Point de suivi mensuel avec le sponsor" },
];
