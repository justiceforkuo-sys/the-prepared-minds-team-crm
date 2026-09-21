import { NextResponse } from "next/server";

// Géocodage via Nominatim (OpenStreetMap) — gratuit, sans clé API. Appelé
// côté serveur car Nominatim demande un User-Agent descriptif et déconseille
// les appels directs depuis le navigateur. Limite d'usage : ~1 req/sec.
export async function POST(request: Request) {
  const { address, locality } = await request.json();
  const query = [address, locality].filter(Boolean).join(", ").trim();
  if (!query) return NextResponse.json(null);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "be");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "batisseur-crm/1.0 (Prepared Minds Team, contact via app)" },
    });
    const results = await res.json();
    const first = results?.[0];
    if (!first) return NextResponse.json(null);
    return NextResponse.json({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
  } catch (err) {
    console.error("geocode: fetch error", err);
    return NextResponse.json(null);
  }
}
