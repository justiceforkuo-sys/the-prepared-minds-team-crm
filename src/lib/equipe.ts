import type { SupabaseClient } from "@supabase/supabase-js";

/** Collaborateurs sous une personne (tous niveaux), sans elle-même. */
export async function equipeDe(svc: SupabaseClient, meId: string): Promise<Set<string>> {
  const { data } = await svc.from("people").select("id, reports_to");
  const kids = new Map<string, string[]>();
  for (const p of (data as { id: string; reports_to: string | null }[] | null) ?? []) if (p.reports_to) kids.set(p.reports_to, [...(kids.get(p.reports_to) ?? []), p.id]);
  const scope = new Set<string>();
  const stack = [meId];
  while (stack.length) {
    for (const k of kids.get(stack.pop()!) ?? []) {
      if (scope.has(k)) continue;
      scope.add(k);
      stack.push(k);
    }
  }
  return scope;
}
