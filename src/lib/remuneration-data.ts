import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaremeRow, ForfaitRow, RattrapageRow, RemuManuel, RemuSummary } from "@/lib/remuneration";

/** Charge la rémunération de démarrage d'une personne (via la RLS : soi-même, ou l'admin). */
export async function loadRemuSummary(supabase: SupabaseClient, personId: string): Promise<RemuSummary> {
  const [{ data: bareme }, { data: forfaits }, { data: rattrapage }, { data: manuelRow }] = await Promise.all([
    supabase.from("bareme_forfait_client").select("id, rang_min, rang_max, montant, date_effet").order("rang_min"),
    supabase
      .from("forfaits_clients")
      .select("client_id, rang_client, montant, signe_le, paye_le, client:clients(name)")
      .eq("user_id", personId)
      .order("rang_client"),
    supabase.from("rattrapages").select("*").eq("user_id", personId).maybeSingle(),
    supabase.from("remu_manuel").select("nb_clients, forfaits_total, forfaits_payes, unites, reserve, rattrapage, note").eq("user_id", personId).maybeSingle(),
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
  const m = manuelRow as (Record<keyof RemuManuel, unknown>) | null;
  const manuel: RemuManuel | null = m
    ? {
        nb_clients: Number(m.nb_clients) || 0,
        forfaits_total: Number(m.forfaits_total) || 0,
        forfaits_payes: Number(m.forfaits_payes) || 0,
        unites: Number(m.unites) || 0,
        reserve: Number(m.reserve) || 0,
        rattrapage: m.rattrapage === null || m.rattrapage === undefined ? null : Number(m.rattrapage),
        note: (m.note as string | null) ?? null,
      }
    : null;
  const forfaitsTotal = manuel ? manuel.forfaits_total : rows.reduce((a, f) => a + f.montant, 0);
  const forfaitsPayes = manuel ? manuel.forfaits_payes : rows.filter((f) => f.paye_le).reduce((a, f) => a + f.montant, 0);
  const reserveFinale = manuel ? manuel.reserve : reserve;

  return {
    bareme: ((bareme as BaremeRow[] | null) ?? []).map((b) => ({ ...b, montant: Number(b.montant) })),
    forfaits: manuel ? [] : rows,
    forfaitsTotal,
    forfaitsPayes,
    rattrapage: (rattrapage as RattrapageRow | null) ?? null,
    reserve: reserveFinale,
    unitsPaidValue,
    unitsTotal: manuel ? manuel.unites : unitsTotal,
    rattrapageEstime: manuel?.rattrapage ?? Math.max(0, Math.round((reserveFinale - forfaitsTotal) * 100) / 100),
    clientsCount: manuel ? manuel.nb_clients : rows.length,
    manuel,
  };
}
