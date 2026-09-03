import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { EquipeBoard } from "./equipe-board";
import { TeamProduction } from "./team-production";
import type { TeamProductionRow } from "@/types/database";

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

  if (downlineIds.length > 0) {
    const [{ data: budgetRows }, { data: payoutRows }] = await Promise.all([
      supabase.from("budget_items").select("person_id, amount, is_annual").in("person_id", downlineIds),
      supabase
        .from("payout_history")
        .select("person_id, month, payout")
        .in("person_id", downlineIds)
        .order("month", { ascending: false }),
    ]);
    for (const row of budgetRows ?? []) {
      const monthly = row.is_annual ? row.amount / 12 : row.amount;
      budgetTotals[row.person_id] = (budgetTotals[row.person_id] ?? 0) + monthly;
    }
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
