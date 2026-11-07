import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { ONLINE_WINDOW_SECONDS } from "@/lib/presence";

// Signal de présence : « active: true » enregistre le temps passé (fonction presence_ping, migration 055) ;
// dans tous les cas, la réponse donne la liste des personnes en ligne (dernier signal il y a moins de 100 s).

export async function POST(request: Request) {
  const me = await getCurrentPerson();
  if (!me) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  const svc = createServiceClient() as unknown as SupabaseClient;

  let active = false;
  try {
    const body = (await request.json()) as { active?: unknown };
    active = body.active === true;
  } catch {
    // corps absent : simple lecture de la liste
  }
  if (active) await svc.rpc("presence_ping", { p_person: me.id });

  const since = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString();
  const { data: rows } = await svc.from("activity_daily").select("person_id").gte("last_seen", since);
  const ids = [...new Set(((rows as { person_id: string }[] | null) ?? []).map((r) => r.person_id))];
  if (ids.length === 0) return NextResponse.json({ online: [] });
  const { data: people } = await svc.from("people").select("id, name").in("id", ids);
  const online = ((people as { id: string; name: string }[] | null) ?? []).map((p) => ({ id: p.id, name: p.name }));
  return NextResponse.json({ online });
}
