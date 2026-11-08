import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { FinancesWorkspace } from "./finances-workspace";
import type { Debt, DebtPayment } from "./debts-section";
import type { DailySpend } from "./daily-section";
import type { Frais, FraisPct } from "./frais-section";
import type { Revenu } from "./revenus-section";
import type { Recu } from "./recus-section";
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

  const [{ data: payouts }, { data: expenses }, { data: deductibleSavings }, { data: settings }, { data: goals }, { data: debts }, { data: debtPayments }, { data: daily }, { data: dailySettings }, { data: frais }, { data: fraisPct }, { data: revenus }, { data: recus }, { data: sourcesRows }] =
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
      supabase.from("finance_frais").select("*").eq("person_id", person.id).order("spent_on").limit(5000),
      supabase.from("finance_frais_pct").select("annee, categorie, pct, justification").eq("person_id", person.id),
      supabase.from("finance_revenus").select("*").eq("person_id", person.id).order("ordre"),
      supabase.from("finance_revenus_recus").select("mois, source, montant, note, fiche").eq("person_id", person.id).order("mois"),
      supabase.from("finance_revenus_sources").select("nom, ordre").eq("person_id", person.id).order("ordre"),
    ]);

  const revenusAnnee = ((payouts as PayoutHistoryRow[] | null) ?? [])
    .filter((p) => p.month.startsWith(currentYear))
    .reduce((s, p) => s + p.payout, 0);

  const fraisList = ((frais as Frais[] | null) ?? []).map((f) => ({ ...f, montant: Number(f.montant) }));
  const pctList = ((fraisPct as FraisPct[] | null) ?? []).map((p) => ({ ...p, pct: Number(p.pct) }));
  const revenusList = ((revenus as Revenu[] | null) ?? []).map((r) => ({
    ...r,
    montant_prudent: r.montant_prudent === null ? null : Number(r.montant_prudent),
    montant_complet: r.montant_complet === null ? null : Number(r.montant_complet),
  }));
  const recusList = ((recus as Recu[] | null) ?? []).map((r) => ({ ...r, montant: r.montant === null ? null : Number(r.montant) }));
  // Frais professionnels déductibles de l'année en cours (total × % d'usage pro par catégorie) : ils réduisent le revenu imposable
  const fraisDeductiblesAnnee = fraisList
    .filter((f) => f.spent_on.startsWith(currentYear))
    .reduce((s, f) => s + f.montant * (pctList.find((p) => String(p.annee) === currentYear && p.categorie === f.categorie)?.pct ?? 0), 0);

  const defaultSettings: FinancialSettings = {
    person_id: person.id,
    taux_cotisations_sociales: 0.205,
    taux_imposition: 0.32,
    taxe_communale: 0.07,
    objectif_fonds_urgence_mois: 6,
    fonds_urgence_actuel: 0,
    rendement_epargne_pension: 0.02,
    annees_avant_pension: 20,
    statut_pro: null,
    updated_at: "",
  };

  return (
    <FinancesWorkspace
      personId={person.id}
      revenusAnnee={revenusAnnee}
      fraisDeductiblesAnnee={Math.round(fraisDeductiblesAnnee * 100) / 100}
      initialFrais={fraisList}
      initialFraisPct={pctList}
      initialRevenus={revenusList}
      initialRecus={recusList}
      // Colonnes choisies, plus toute colonne qui a déjà des montants : une donnée saisie ne reste jamais cachée
      initialSources={[...new Set([...((sourcesRows as { nom: string }[] | null) ?? []).map((r) => r.nom), ...recusList.map((r) => r.source)])]}
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
