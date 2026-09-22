import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { FinancesWorkspace } from "./finances-workspace";
import type { DeductibleSaving, Expense, FinancialSettings, PayoutHistoryRow, SavingsGoal } from "@/types/database";

export default async function FinancesPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const currentYear = new Date().getFullYear().toString();
  const supabase = await createClient();

  const [{ data: payouts }, { data: expenses }, { data: deductibleSavings }, { data: settings }, { data: goals }] =
    await Promise.all([
      supabase.from("payout_history").select("month, payout").eq("person_id", person.id),
      supabase.from("expenses").select("*").eq("person_id", person.id).order("date", { ascending: false }),
      supabase.from("deductible_savings").select("*").eq("person_id", person.id).order("created_at"),
      supabase.from("financial_settings").select("*").eq("person_id", person.id).maybeSingle(),
      supabase.from("savings_goals").select("*").eq("person_id", person.id).order("created_at"),
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
    />
  );
}
