import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { IdeesBoard } from "./idees-board";
import type { Idee, Tiroir } from "@/lib/idees";

export default async function IdeesPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const [{ data: ideeRows }, { data: tiroirRows }, { data: authors }] = await Promise.all([
    supabase.from("idees").select("*").order("cree_le", { ascending: false }).limit(500),
    supabase.from("tiroirs").select("*").order("numero"),
    supabase.from("people").select("id, name"),
  ]);
  const all = (ideeRows as Idee[] | null) ?? [];
  const tiroirs = (tiroirRows as Tiroir[] | null) ?? [];
  // Sa propre liste de tiroirs si elle existe, sinon la liste par défaut
  const own = tiroirs.filter((t) => t.owner_id === person.id);
  const list = own.length > 0 ? own : tiroirs.filter((t) => t.owner_id === null);
  const names = new Map(((authors as { id: string; name: string }[] | null) ?? []).map((p) => [p.id, p.name]));

  return (
    <IdeesBoard
      hasParrain={!!person.reports_to}
      isJustice={person.slug === "justice"}
      ideas={all.filter((i) => i.user_id === person.id)}
      shared={all.filter((i) => i.user_id !== person.id).map((i) => ({ ...i, auteur: names.get(i.user_id) ?? "Collaborateur" }))}
      tiroirs={list.map((t) => ({ numero: t.numero, nom: t.nom, famille: t.famille }))}
      usingDefaultList={own.length === 0}
    />
  );
}
