import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import type { DealStage } from "@/types/database";
import { DecomptesBoard, type DecompteRow } from "./decomptes-board";

type RawPolicy = {
  id: string;
  product_label: string | null;
  partner: string | null;
  units: number | null;
  worth: number | null;
  deal_stage: DealStage;
  signed_on: string | null;
  decompte_month: string | null;
  client: { name: string; owner_id: string } | { name: string; owner_id: string }[] | null;
};

function monthOptions(count = 10): string[] {
  const now = brusselsNow();
  return Array.from({ length: count }, (_, i) => toISO(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
}

export default async function DecomptesPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const person = await getCurrentPerson();
  if (!person) return null;
  if (person.status === "essai") notFound();

  const options = monthOptions();
  const { mois } = await searchParams;
  const month = mois && /^\d{4}-(0[1-9]|1[0-2])$/.test(mois) ? mois : options[0];
  if (!options.includes(month)) options.push(month);

  // L'administrateur voit toute l'équipe ; un collaborateur ne voit que ce que la RLS lui ouvre (lui-même et son équipe).
  const db: SupabaseClient = person.is_admin ? (createServiceClient() as unknown as SupabaseClient) : ((await createClient()) as unknown as SupabaseClient);

  const rows: DecompteRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db
      .from("client_policies")
      .select("id, product_label, partner, units, worth, deal_stage, signed_on, decompte_month, client:clients!inner(name, owner_id)")
      .eq("production_month", month)
      .order("id")
      .range(from, from + 999);
    for (const p of ((data as unknown as RawPolicy[] | null) ?? [])) {
      const c = Array.isArray(p.client) ? p.client[0] : p.client;
      if (!c) continue;
      rows.push({
        id: p.id,
        client_name: c.name,
        owner_id: c.owner_id,
        product_label: p.product_label,
        partner: p.partner,
        units: Number(p.units) || 0,
        worth: Number(p.worth) || 0,
        deal_stage: p.deal_stage,
        signed_on: p.signed_on,
        decompte_month: p.decompte_month,
      });
    }
    if (!data || data.length < 1000) break;
  }

  const { data: people } = await db.from("people").select("id, name");
  const names: Record<string, string> = {};
  for (const p of (people as { id: string; name: string }[] | null) ?? []) names[p.id] = p.name;

  // Nombre de preuves de paiement jointes à chaque contrat du mois
  const proofs: Record<string, number> = {};
  for (let i = 0; i < rows.length; i += 150) {
    const { data } = await db.from("decompte_preuves").select("client_policy_id").in("client_policy_id", rows.slice(i, i + 150).map((r) => r.id));
    for (const r of (data as { client_policy_id: string }[] | null) ?? []) proofs[r.client_policy_id] = (proofs[r.client_policy_id] ?? 0) + 1;
  }

  // Corrections manuelles du PVQ1 pour ce mois
  const { data: adj } = await db.from("pvq1_ajustements").select("user_id, pct, note").eq("month", month);
  const ajustements: Record<string, { pct: number; note: string | null }> = {};
  for (const a of (adj as { user_id: string; pct: number; note: string | null }[] | null) ?? []) ajustements[a.user_id] = { pct: Number(a.pct), note: a.note };

  return <DecomptesBoard key={month} month={month} monthOptions={options} rows={rows} names={names} isAdmin={person.is_admin} meId={person.id} proofs={proofs} ajustements={ajustements} />;
}
