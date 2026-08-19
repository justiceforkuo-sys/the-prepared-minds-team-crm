import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { RecrutementBoard } from "./recrutement-board";

export default async function RecrutementPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const { data: candidates } = await supabase
    .from("recruitment_applications")
    .select("*, recruiter:people!recruitment_applications_recruiter_id_fkey(name)")
    .order("created_at", { ascending: false });

  return (
    <RecrutementBoard
      isAdmin={person.is_admin}
      initialCandidates={candidates ?? []}
      mySlug={person.slug}
    />
  );
}
