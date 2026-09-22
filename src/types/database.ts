export type Rank = "JFAI" | "JFAII" | "JFAIII" | "FA" | "FC" | "CD" | "CR" | "CN";
export type ClientStatus = "Client" | "Prospect";
export type ProspectStage =
  | "Contact"
  | "Invité"
  | "Présentation faite"
  | "Suivi"
  | "Partenaire"
  | "Perdu"
  | "Contacté"
  | "Répondu"
  | "Échange qualifié"
  | "Mise en relation obtenue"
  | "Nouveau lead client généré"
  | "Sans suite"
  | "RDV pris"
  | "Entretien / Dossier";
export type Priority = "A" | "B" | "C";
export type ProspectCategory = "recrutement" | "client" | "prescripteur";
export type ConnectionStatus = "Oui" | "Non" | "En attente";
export type RemovalStatus = "pending" | "approved" | "rejected";
export type ContractType = "apporteur" | "intermediaire";
export type PersonStatus = "essai" | "actif";

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
  contract_type: ContractType;
  status: PersonStatus;
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
  lat: number | null;
  lng: number | null;
  referred_by_client_id: string | null;
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

export interface OvbPeriod {
  id: string;
  period_month: string;
  start_date: string;
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
  category: ProspectCategory;
  network_contact_name: string | null;
  connection_status: ConnectionStatus | null;
  redirected_client_id: string | null;
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

export type BudgetCategory = "Fixe" | "Professionnelle" | "Extra" | "Annuelle" | "Imprévue" | "Dons / Famille";

export interface BudgetItem {
  id: string;
  person_id: string;
  label: string;
  category: BudgetCategory;
  is_annual: boolean;
  created_at: string;
}

export interface BudgetEntry {
  id: string;
  item_id: string;
  month: string;
  amount: number;
  created_at: string;
}

export interface BudgetMonthLine {
  item_id: string;
  label: string;
  category: BudgetCategory;
  is_annual: boolean;
  amount: number;
  entry_month: string | null;
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

export type ReminderStatus = "pending" | "sent" | "cancelled";

export interface PaymentReminder {
  id: string;
  client_policy_id: string;
  created_by: string;
  remind_on: string;
  note: string | null;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
}

export interface LinkedinSprint {
  id: string;
  person_id: string;
  titre: string;
  date_debut: string;
  date_fin: string;
  cible_contacts_recrutement: number;
  cible_echanges_recrutement: number;
  cible_entretiens_recrutement: number;
  cible_jfa_recrutement: number;
  cible_contacts_client: number;
  cible_echanges_client: number;
  cible_rdv_client: number;
  cible_dossiers_client: number;
  cible_contacts_prescripteur: number;
  cible_echanges_prescripteur: number;
  cible_mises_en_relation_prescripteur: number;
  cible_leads_prescripteur: number;
  created_at: string;
}

export interface LinkedinWeeklyLog {
  id: string;
  person_id: string;
  semaine_debut: string;
  connexions_envoyees: number;
  connexions_acceptees: number;
  posts_publies: number;
  commentaires_postes: number;
  created_at: string;
}

export interface ExistingContactMatch {
  source: "prospect" | "client";
  matched_name: string;
  collaborateur: string;
  since: string;
}

export interface AdminImpersonationLog {
  id: string;
  admin_id: string;
  target_id: string;
  started_at: string;
  ended_at: string | null;
}

export type ExpenseType = "professionnelle" | "personnelle";
export type DeductibleSavingType =
  | "epargne_pension"
  | "epargne_long_terme"
  | "plci_cpti"
  | "revenu_garanti"
  | "autre";

export interface FinancialSettings {
  person_id: string;
  taux_cotisations_sociales: number;
  taux_imposition: number;
  taxe_communale: number;
  objectif_fonds_urgence_mois: number;
  fonds_urgence_actuel: number;
  rendement_epargne_pension: number;
  annees_avant_pension: number;
  updated_at: string;
}

export interface Expense {
  id: string;
  person_id: string;
  categorie: string;
  montant: number;
  type: ExpenseType;
  date: string;
  recurrente: boolean;
  created_at: string;
}

export interface DeductibleSaving {
  id: string;
  person_id: string;
  type: DeductibleSavingType;
  nom: string | null;
  cotisation_mensuelle: number;
  avantage_fiscal_taux: number;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  person_id: string;
  nom: string;
  montant_cible: number;
  montant_actuel: number;
  date_cible: string | null;
  created_at: string;
}

export interface TrainingModule {
  id: string;
  order_index: number;
  title: string;
  content: string;
  created_at: string;
}

export interface TrainingQuestion {
  id: string;
  module_id: string;
  order_index: number;
  question: string;
  options: string[];
  correct_option: number;
  created_at: string;
}

// Vue `training_questions_quiz` — mêmes champs que TrainingQuestion sans
// `correct_option`, utilisée côté collaborateur pour ne jamais exposer la
// clé de correction.
export type TrainingQuizQuestion = Omit<TrainingQuestion, "correct_option">;

export interface TrainingProgress {
  id: string;
  person_id: string;
  module_id: string;
  best_score: number | null;
  passed: boolean;
  passed_at: string | null;
  attempts_count: number;
  updated_at: string;
}

// Generic Supabase generic-client shape. We keep it loose (not a strict
// generated Database type) since this project doesn't run `supabase gen
// types` — swap in the generated type later if you wire up the Supabase CLI.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
