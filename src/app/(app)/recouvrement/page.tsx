import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { RecouvrementBoard } from "./recouvrement-board";

export default async function RecouvrementPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: policies } = await supabase
    .from("client_policies")
    .select("*, client:clients(name, owner_id)")
    .or(
      `payment_status.not.is.null,and(followup_date.lte.${today},policy_status.eq.Actif,payment_status.is.null)`
    );

  return (
    <RecouvrementBoard
      meId={person.id}
      isAdmin={person.is_admin}
      initialPolicies={policies ?? []}
    />
  );
}
