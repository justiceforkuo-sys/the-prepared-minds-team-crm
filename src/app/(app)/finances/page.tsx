import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { FinancesWorkspace } from "./finances-workspace";
import type { Debt, DebtPayment } from "./debts-section";
import type { DailySpend } from "./daily-section";
import type { DeductibleSaving, Expense, FinancialSettings, PayoutHistoryRow, SavingsGoal } from "@/types/database";

export default async function FinancesPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const currentYear = new Date().getFullYear().toString();
  const supabase = await createClient();

  // Dépenses du quotidien : les 62 derniers jours suffisent (mois en cours, mois précédent, graphique de 14 jours)
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 62);
  const since = sinceDate.toISOString().slice(0, 10);

  const [{ data: payouts }, { data: expenses }, { data: deductibleSavings }, { data: settings }, { data: goals }, { data: debts }, { data: debtPayments }, { data: daily }, { data: dailySettings }] =
    await Promise.all([
      supabase.from("payout_history").select("month, payout").eq("person_id", person.id),
      supabase.from("expenses").select("*").eq("person_id", person.id).order("date", { ascending: false }),
      supabase.from("deductible_savings").select("*").eq("person_id", person.id).order("created_at"),
      supabase.from("financial_settings").select("*").eq("person_id", person.id).maybeSingle(),
      supabase.from("savings_goals").select("*").eq("person_id", person.id).order("created_at"),
      supabase.from("finance_debts").select("*").eq("person_id", person.id).order("created_at"),
      supabase.from("finance_debt_payments").select("*").eq("person_id", person.id).order("paid_on", { ascending: false }),
      supabase.from("finance_daily").select("*").eq("person_id", person.id).gte("spent_on", since).order("spent_on", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("finance_daily_settings").select("budget_jour").eq("person_id", person.id).maybeSingle(),
    ]);

  const revenusAnnee = ((payouts as PayoutHistoryRow[] | null) ?? [])
    .filter((p) => p.month.startsWith(currentYear))
    .reduce((s, p) => s + p.payout, 0);

  const defaultSettings: FinancialSettings = {
    person_id: person.id,
    taux_cotisations_sociales: 0.205,
    taux_imposition: 0.32,
    taxe_communale: 0.07,
    objectif_fonds_urgence_mois: 6,
    fonds_urgence_actuel: 0,
    rendement_epargne_pension: 0.02,
    annees_avant_pension: 20,
    updated_at: "",
  };

  return (
    <FinancesWorkspace
      personId={person.id}
      revenusAnnee={revenusAnnee}
      initialExpenses={(expenses as Expense[]) ?? []}
      initialDeductibleSavings={(deductibleSavings as DeductibleSaving[]) ?? []}
      initialSettings={(settings as FinancialSettings | null) ?? defaultSettings}
      initialGoals={(goals as SavingsGoal[]) ?? []}
      initialDebts={((debts as Debt[] | null) ?? []).map((d) => ({ ...d, total: Number(d.total), deja_paye: Number(d.deja_paye), paiement_mensuel: d.paiement_mensuel === null ? null : Number(d.paiement_mensuel) }))}
      initialDebtPayments={((debtPayments as DebtPayment[] | null) ?? []).map((p) => ({ ...p, montant: Number(p.montant) }))}
      initialDaily={((daily as DailySpend[] | null) ?? []).map((d) => ({ ...d, montant: Number(d.montant) }))}
      initialDailyBudget={(dailySettings as { budget_jour: number | string | null } | null)?.budget_jour == null ? null : Number((dailySettings as { budget_jour: number | string }).budget_jour)}
    />
  );
}
