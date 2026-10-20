import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaremeRow, ForfaitRow, RattrapageRow, RemuSummary } from "@/lib/remuneration";

/** Charge la rémunération de démarrage d'une personne (via la RLS : soi-même, ou l'admin). */
export async function loadRemuSummary(supabase: SupabaseClient, personId: string): Promise<RemuSummary> {
  const [{ data: bareme }, { data: forfaits }, { data: rattrapage }] = await Promise.all([
    supabase.from("bareme_forfait_client").select("id, rang_min, rang_max, montant, date_effet").order("rang_min"),
    supabase
      .from("forfaits_clients")
      .select("client_id, rang_client, montant, signe_le, paye_le, client:clients(name)")
      .eq("user_id", personId)
      .order("rang_client"),
    supabase.from("rattrapages").select("*").eq("user_id", personId).maybeSingle(),
  ]);

  let reserve = 0;
  let unitsPaidValue = 0;
  let unitsTotal = 0;
  for (let from = 0; ; from += 1000) {
    const { data: pols } = await supabase
      .from("client_policies")
      .select("units, valeur_point_souscription, statut_collab_souscription, client:clients!inner(owner_id)")
      .eq("client.owner_id", personId)
      .range(from, from + 999);
    for (const p of (pols as { units: number | null; valeur_point_souscription: number | null; statut_collab_souscription: string | null }[] | null) ?? []) {
      const u = Number(p.units) || 0;
      const v = u * (Number(p.valeur_point_souscription) || 0);
      unitsTotal += u;
      if (p.statut_collab_souscription === "sous_agent") unitsPaidValue += v;
      else reserve += v;
    }
    if (!pols || pols.length < 1000) break;
  }

  const rows: ForfaitRow[] = ((forfaits as unknown as (Omit<ForfaitRow, "client_name"> & { client: { name: string } | { name: string }[] | null })[] | null) ?? []).map((f) => {
    const c = Array.isArray(f.client) ? f.client[0] : f.client;
    return {
      client_id: f.client_id,
      client_name: c?.name ?? null,
      rang_client: f.rang_client,
      montant: Number(f.montant),
      signe_le: f.signe_le,
      paye_le: f.paye_le,
    };
  });
  const forfaitsTotal = rows.reduce((a, f) => a + f.montant, 0);
  const forfaitsPayes = rows.filter((f) => f.paye_le).reduce((a, f) => a + f.montant, 0);

  return {
    bareme: ((bareme as BaremeRow[] | null) ?? []).map((b) => ({ ...b, montant: Number(b.montant) })),
    forfaits: rows,
    forfaitsTotal,
    forfaitsPayes,
    rattrapage: (rattrapage as RattrapageRow | null) ?? null,
    reserve,
    unitsPaidValue,
    unitsTotal,
    rattrapageEstime: Math.max(0, Math.round((reserve - forfaitsTotal) * 100) / 100),
  };
}
