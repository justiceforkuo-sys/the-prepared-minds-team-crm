import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { EquipeBoard } from "./equipe-board";
import { TeamProduction } from "./team-production";
import type { TeamProductionRow, BudgetMonthLine } from "@/types/database";

export default async function EquipePage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const [{ data: downline }, { data: pendingRequests }, { data: production }] = await Promise.all([
    supabase
      .from("people")
      .select("*")
      .eq("reports_to", person.id)
      .order("name"),
    supabase
      .from("removal_requests")
      .select("*, target:people!removal_requests_target_id_fkey(name), requester:people!removal_requests_requested_by_fkey(name)")
      .eq("status", "pending")
      .order("created_at"),
    supabase.rpc("get_team_production"),
  ]);

  const downlineIds = (downline ?? []).map((d) => d.id);
  const budgetTotals: Record<string, number> = {};
  const lastPayouts: Record<string, number> = {};
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (downlineIds.length > 0) {
    const [budgetResults, { data: payoutRows }] = await Promise.all([
      Promise.all(
        downlineIds.map((id) =>
          supabase.rpc("get_budget_month", { p_person_id: id, p_month: currentMonth })
        )
      ),
      supabase
        .from("payout_history")
        .select("person_id, month, payout")
        .in("person_id", downlineIds)
        .order("month", { ascending: false }),
    ]);
    budgetResults.forEach(({ data }, i) => {
      const lines = (data as BudgetMonthLine[] | null) ?? [];
      const total = lines.reduce((s, l) => s + (l.is_annual ? l.amount / 12 : l.amount), 0);
      budgetTotals[downlineIds[i]] = total;
    });
    for (const row of payoutRows ?? []) {
      if (!(row.person_id in lastPayouts)) lastPayouts[row.person_id] = row.payout;
    }
  }

  return (
    <div>
      <EquipeBoard
        me={person}
        downline={downline ?? []}
        pendingRequests={pendingRequests ?? []}
        budgetTotals={budgetTotals}
        lastPayouts={lastPayouts}
      />
      <TeamProduction rows={(production as TeamProductionRow[] | null) ?? []} />
    </div>
  );
}
