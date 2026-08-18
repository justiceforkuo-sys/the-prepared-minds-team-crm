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

  return (
    <div>
      <EquipeBoard
        me={person}
        downline={downline ?? []}
        pendingRequests={pendingRequests ?? []}
      />
      <TeamProduction rows={(production as TeamProductionRow[] | null) ?? []} />
    </div>
  );
}
