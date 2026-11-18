import { createClient } from "@/utils/supabase/server";
import type { Person } from "@/types/database";

export async function getCurrentPerson(): Promise<Person | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("people")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Une fiche désactivée (collaborateur parti) n'a plus accès au CRM, même avec une session encore valide.
  const person = data as Person | null;
  if (person && !person.active) return null;
  return person ?? null;
}
