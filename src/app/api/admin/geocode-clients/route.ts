import { NextResponse } from "next/server";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";

// Backfill du géocodage, en lot (le client rappelle cette route jusqu'à ce que
// `remaining` tombe à 0). En lot pour rester bien sous les limites de durée
// d'une fonction serverless malgré le débit limité (~1 req/sec) de Nominatim.
// Utilise le service role car les clients d'autres collaborateurs ne sont pas
// modifiables par l'admin via la policy RLS `clients_update_own`.
const BATCH_SIZE = 10;

export async function POST() {
  const person = await getCurrentPerson();
  if (!person || !person.is_admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: clients, error: fetchError } = await supabase
    .from("clients")
    .select("id, address, locality")
    .is("lat", null)
    .not("address", "is", null)
    .order("id")
    .limit(BATCH_SIZE);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let succeeded = 0;
  let failed = 0;

  for (const c of clients ?? []) {
    const query = [c.address, c.locality].filter(Boolean).join(", ").trim();
    let geo: { lat: number; lng: number } | null = null;
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "be");
      const res = await fetch(url, {
        headers: { "User-Agent": "batisseur-crm/1.0 (Prepared Minds Team, contact via app)" },
      });
      const results = await res.json();
      const first = results?.[0];
      if (first) geo = { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
    } catch (err) {
      console.error("geocode-clients: fetch error", err);
    }

    if (geo) {
      const { error: updateError } = await supabase
        .from("clients")
        .update({ lat: geo.lat, lng: geo.lng })
        .eq("id", c.id);
      if (updateError) {
        console.error("geocode-clients: update error", updateError);
        failed += 1;
      } else {
        succeeded += 1;
      }
    } else {
      failed += 1;
      // Marque comme "essayé" avec lng nul mais lat à 0 impossible sans casser la
      // requête `is(lat, null)` — on laisse tel quel : un échec Nominatim reste
      // retentable plus tard (adresse à corriger manuellement dans l'intervalle).
    }

    await new Promise((r) => setTimeout(r, 1100)); // limite Nominatim : ~1 req/sec
  }

  const { count: remaining } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .is("lat", null)
    .not("address", "is", null);

  return NextResponse.json({ succeeded, failed, remaining: remaining ?? 0 });
}
