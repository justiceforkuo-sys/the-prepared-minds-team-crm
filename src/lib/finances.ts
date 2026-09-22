import type { DeductibleSaving, Expense, FinancialSettings, SavingsGoal } from "@/types/database";

export interface FinancesInput {
  revenusAnnee: number;
  expenses: Expense[];
  deductibleSavings: DeductibleSaving[];
  settings: FinancialSettings;
}

export interface FinancesResult {
  revenusAnnee: number;
  chargesProAnnee: number;
  revenuNetImposable: number;
  cotisationsSociales: number;
  cotisationsSocialesTrimestre: number;
  baseImposable: number;
  impot: number;
  revenuNetDisponibleAnnee: number;
  revenuNetDisponibleMois: number;
  epargneMensuelleTotale: number;
  chargesPersoMensuelles: number;
  epargneMensuelleMoyenne: number;
  capitalProjete: number;
  fondsUrgenceCible: number;
  fondsUrgenceProgression: number;
}

function monthlyRecurrente(expenses: Expense[], type: Expense["type"]): number {
  const relevant = expenses.filter((e) => e.type === type && e.recurrente);
  return relevant.reduce((s, e) => s + e.montant, 0);
}

export function computeFinances({ revenusAnnee, expenses, deductibleSavings, settings }: FinancesInput): FinancesResult {
  const chargesProAnnee = expenses.filter((e) => e.type === "professionnelle").reduce((s, e) => s + e.montant, 0);

  const revenuNetImposable = revenusAnnee - chargesProAnnee;
  const cotisationsSociales = revenuNetImposable * settings.taux_cotisations_sociales;
  const baseImposable = revenuNetImposable - cotisationsSociales;
  const impot = baseImposable * settings.taux_imposition * (1 + settings.taxe_communale);
  // = revenus - charges_pro - cotisations_sociales - impot (les cotisations
  // sont déjà retirées dans baseImposable, ne pas les soustraire deux fois).
  const revenuNetDisponibleAnnee = baseImposable - impot;
  const revenuNetDisponibleMois = revenuNetDisponibleAnnee / 12;

  const epargneMensuelleTotale = deductibleSavings.reduce((s, d) => s + d.cotisation_mensuelle, 0);
  const chargesProMensuelles = monthlyRecurrente(expenses, "professionnelle");
  const chargesPersoMensuelles = monthlyRecurrente(expenses, "personnelle");
  const epargneMensuelleMoyenne = revenuNetDisponibleMois - epargneMensuelleTotale - chargesPersoMensuelles;

  const r = settings.rendement_epargne_pension;
  const n = settings.annees_avant_pension;
  const cotisationAnnuelleTotale = epargneMensuelleTotale * 12;
  const capitalProjete = r > 0 ? cotisationAnnuelleTotale * ((Math.pow(1 + r, n) - 1) / r) : cotisationAnnuelleTotale * n;

  const fondsUrgenceCible = settings.objectif_fonds_urgence_mois * chargesProMensuelles;
  const fondsUrgenceProgression = fondsUrgenceCible > 0 ? settings.fonds_urgence_actuel / fondsUrgenceCible : 0;

  return {
    revenusAnnee,
    chargesProAnnee,
    revenuNetImposable,
    cotisationsSociales,
    cotisationsSocialesTrimestre: cotisationsSociales / 4,
    baseImposable,
    impot,
    revenuNetDisponibleAnnee,
    revenuNetDisponibleMois,
    epargneMensuelleTotale,
    chargesPersoMensuelles,
    epargneMensuelleMoyenne,
    capitalProjete,
    fondsUrgenceCible,
    fondsUrgenceProgression,
  };
}

export function moisRestants(dateCible: string | null): number {
  if (!dateCible) return 0;
  const now = new Date();
  const target = new Date(dateCible);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export function mensualiteObjectif(goal: SavingsGoal): number {
  const restant = goal.montant_cible - goal.montant_actuel;
  if (restant <= 0) return 0;
  return restant / moisRestants(goal.date_cible);
}

export function cotisationAnnuelle(saving: DeductibleSaving): number {
  return saving.cotisation_mensuelle * 12;
}

// L'avantage fiscal d'une cotisation déductible réduit la base imposable,
// donc la taxe communale (additionnelle à l'IPP) s'applique aussi dessus —
// même principe que pour le calcul de l'impôt lui-même.
export function avantageFiscalAnnuel(saving: DeductibleSaving, taxeCommunale: number): number {
  return cotisationAnnuelle(saving) * saving.avantage_fiscal_taux * (1 + taxeCommunale);
}

export function coutReelNetAnnuel(saving: DeductibleSaving, taxeCommunale: number): number {
  return cotisationAnnuelle(saving) - avantageFiscalAnnuel(saving, taxeCommunale);
}
