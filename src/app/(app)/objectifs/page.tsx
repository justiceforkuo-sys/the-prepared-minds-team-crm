import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { ObjectifsList } from "./objectifs-list";
import { EngagementCalculator } from "./engagement-calculator";

export default async function ObjectifsPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <EngagementCalculator />
      <ObjectifsList personId={person.id} initialGoals={goals ?? []} />
    </div>
  );
}
