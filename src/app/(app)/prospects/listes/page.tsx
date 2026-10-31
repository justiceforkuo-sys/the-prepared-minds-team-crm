import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { ListesBoard, type ListeCard, type ListeDetail, type ListeProspect, type ShareRow } from "./listes-board";

type Role = "owner" | "edit" | "read";

async function countIn(svc: SupabaseClient, listId: string): Promise<number> {
  const { count } = await svc.from("prospects").select("id", { count: "exact", head: true }).eq("list_id", listId);
  return count ?? 0;
}

export default async function ListesPage({ searchParams }: { searchParams: Promise<{ liste?: string }> }) {
  const me = await getCurrentPerson();
  if (!me) return null;
  const svc = createServiceClient() as unknown as SupabaseClient;
  const { liste } = await searchParams;

  const { data: peopleRows } = await svc.from("people").select("id, name, active").order("name");
  const people = (peopleRows as { id: string; name: string; active: boolean }[] | null) ?? [];
  const names = Object.fromEntries(people.map((p) => [p.id, p.name]));

  const { data: owned } = await svc.from("prospect_lists").select("id, name, owner_id, created_at").eq("owner_id", me.id).order("created_at", { ascending: false });
  const { data: sharedRows } = await svc
    .from("prospect_list_shares")
    .select("can_edit, list:prospect_lists(id, name, owner_id, created_at)")
    .eq("person_id", me.id);

  const cards: ListeCard[] = [];
  for (const l of (owned as { id: string; name: string; owner_id: string }[] | null) ?? []) {
    const { count } = await svc.from("prospect_list_shares").select("person_id", { count: "exact", head: true }).eq("list_id", l.id);
    cards.push({ id: l.id, name: l.name, role: "owner", ownerName: names[l.owner_id] ?? "", count: await countIn(svc, l.id), sharedWith: count ?? 0 });
  }
  for (const s of (sharedRows as unknown as { can_edit: boolean; list: { id: string; name: string; owner_id: string } | { id: string; name: string; owner_id: string }[] | null }[] | null) ?? []) {
    const l = Array.isArray(s.list) ? s.list[0] : s.list;
    if (l) cards.push({ id: l.id, name: l.name, role: s.can_edit ? "edit" : "read", ownerName: names[l.owner_id] ?? "", count: await countIn(svc, l.id), sharedWith: 0 });
  }

  let detail: ListeDetail | null = null;
  const chosen = cards.find((c) => c.id === liste);
  if (chosen) {
    const prospects: ListeProspect[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await svc
        .from("prospects")
        .select("id, name, phone, stage, notes, next_follow_up")
        .eq("list_id", chosen.id)
        .order("name")
        .range(from, from + 999);
      prospects.push(...((data as ListeProspect[] | null) ?? []));
      if (!data || data.length < 1000) break;
    }
    let shares: ShareRow[] = [];
    if (chosen.role === "owner") {
      const { data } = await svc.from("prospect_list_shares").select("person_id, can_edit").eq("list_id", chosen.id);
      shares = ((data as { person_id: string; can_edit: boolean }[] | null) ?? []).map((s) => ({ personId: s.person_id, name: names[s.person_id] ?? "?", canEdit: s.can_edit }));
    }
    detail = { card: chosen, prospects, shares, candidates: people.filter((p) => p.active && p.id !== me.id).map((p) => ({ id: p.id, name: p.name })) };
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink">Listes de prospects</h2>
        <Link href="/prospects" className="text-xs font-bold text-gold-light underline">
          ← Mes prospects
        </Link>
      </div>
      <ListesBoard key={liste ?? "none"} cards={cards} detail={detail} role={(chosen?.role ?? "read") as Role} />
    </div>
  );
}
