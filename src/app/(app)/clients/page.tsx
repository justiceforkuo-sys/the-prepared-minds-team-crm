import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { ClientsBoard } from "./clients-board";

export default async function ClientsPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const { data: downline } = await supabase
    .from("people")
    .select("id, name, rank, active")
    .eq("reports_to", person.id)
    .order("name");

  return (
    <ClientsBoard
      me={{ id: person.id, name: person.name, rank: person.rank, active: person.active }}
      downline={downline ?? []}
    />
  );
}
