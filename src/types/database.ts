export type Rank = "JFAI" | "JFAII" | "JFAIII" | "FA" | "FC" | "CD" | "CR" | "CN";
export type ClientStatus = "Client" | "Prospect";
export type ProspectStage =
  | "Contact"
  | "Invité"
  | "Présentation faite"
  | "Suivi"
  | "Partenaire"
  | "Perdu";
export type Priority = "A" | "B" | "C";
export type RemovalStatus = "pending" | "approved" | "rejected";

export interface Person {
  id: string;
  auth_user_id: string | null;
  slug: string | null;
  name: string;
  rank: Rank;
  active: boolean;
  reports_to: string | null;
  phone: string | null;
  email: string | null;
  is_admin: boolean;
  personal_pts: number;
  team_quarterly_pts: number;
  directs_count: number;
  notes: string | null;
  vision: string | null;
  ranking_position: number | null;
  ranking_points: number | null;
  ranking_days_to_promo: number | null;
  created_at: string;
}

export interface Client {
  id: string;
  owner_id: string;
  name: string;
  status: ClientStatus;
  email: string | null;
  phone: string | null;
  address: string | null;
  locality: string | null;
  total_worth: number;
  total_units: number;
  created_at: string;
}

export type PaymentStatus =
  | "À contacter"
  | "Appelé 1x"
  | "Appelé 2x"
  | "Appelé 3x + vocal"
  | "Promesse (partiel)"
  | "Mise en réduction (contrat gelé)"
  | "Rachat (clôture du contrat)"
  | "Payé";
export type FeedbackReason = "Feedback direction/compagnie" | "Injoignable / coordonnées KO" | "Autre (voir note)";
export type PolicyStatus = "Actif" | "Arrêté" | "Racheté" | "En pause";
export type PolicySource = "manuel" | "ovb";

export interface ClientPolicy {
  id: string;
  client_id: string;
  partner: string | null;
  product: string | null;
  product_label: string | null;
  worth: number;
  units: number;
  unpaid_installments: number | null;
  payment_status: PaymentStatus | null;
  call_1_done: boolean;
  call_2_done: boolean;
  call_3_done: boolean;
  feedback_reason: FeedbackReason | null;
  precision_note: string | null;
  policy_status: PolicyStatus;
  source: PolicySource;
  followup_date: string | null;
  created_at: string;
}

export interface TeamProductionRow {
  person_id: string;
  name: string;
  rank: Rank;
  depth: number;
  active: boolean;
  units_total: number;
  units_this_month: number;
}

export interface CompanyRankingRow {
  person_id: string;
  name: string;
  rank: Rank;
  units_this_month: number;
}

export interface MonthlyProductionRow {
  month: string;
  units: number;
}

export interface Prospect {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  source: string | null;
  notes: string | null;
  stage: ProspectStage;
  priority: Priority;
  next_follow_up: string | null;
  product_id: string | null;
  montant: number | null;
  created_at: string;
}

export interface RemovalRequest {
  id: string;
  target_id: string;
  requested_by: string;
  status: RemovalStatus;
  created_at: string;
}

export interface OnboardingProgress {
  id: string;
  person_id: string;
  step_id: string;
  done_by_self: boolean;
  done_date: string | null;
  validated_by_sponsor: boolean;
  validated_date: string | null;
}

export interface FormationProgress {
  id: string;
  person_id: string;
  module_id: string;
  done: boolean;
  done_date: string | null;
}

export interface UnitsByMonth {
  id: string;
  person_id: string;
  month: string;
  units: number;
}

export interface PayoutHistoryRow {
  id: string;
  person_id: string;
  month: string;
  a_pro: number;
  sto_res: number;
  autre: number;
  payout: number;
}

export type BudgetCategory = "Fixe" | "Extra" | "Annuelle / imprévue";

export interface BudgetItem {
  id: string;
  person_id: string;
  label: string;
  amount: number;
  category: BudgetCategory;
  is_annual: boolean;
  created_at: string;
}

export interface DailyActivity {
  id: string;
  person_id: string;
  date: string;
  prospection: boolean;
  invitation: boolean;
  formation: boolean;
  vision_pillar: boolean;
  etat_esprit: boolean;
  minutes: number;
}

export interface GoalStep {
  id: string;
  text: string;
  done: boolean;
}

export interface Goal {
  id: string;
  person_id: string;
  text: string;
  done: boolean;
  steps: GoalStep[];
  created_at: string;
}

export type RecruitmentStatus = "Nouveau" | "Contacté" | "Entretien" | "Retenu" | "Rejeté";

export interface RecruitmentApplication {
  id: string;
  recruiter_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  current_situation: string | null;
  birthdate: string | null;
  has_cess: boolean | null;
  availability_confirmed: boolean | null;
  french_level: string | null;
  english_level: string | null;
  referral_source: string | null;
  status: RecruitmentStatus;
  jotform_submission_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  assigned_by: string;
  assigned_to: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  done: boolean;
  created_at: string;
}

export interface AdminImpersonationLog {
  id: string;
  admin_id: string;
  target_id: string;
  started_at: string;
  ended_at: string | null;
}

// Generic Supabase generic-client shape. We keep it loose (not a strict
// generated Database type) since this project doesn't run `supabase gen
// types` — swap in the generated type later if you wire up the Supabase CLI.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
