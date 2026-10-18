import type { SupabaseClient } from "@supabase/supabase-js";
import type { LinkedinContact } from "./types";

const PAGE = 1000;

// PostgREST plafonne à 1000 lignes par requête : on pagine pour charger tout le réseau.
export async function fetchAllContacts(supabase: SupabaseClient, ownerId: string): Promise<LinkedinContact[]> {
  const all: LinkedinContact[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("linkedin_contacts")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data as LinkedinContact[] | null) ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

export function brusselsDate(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
}

// Messages envoyés aujourd'hui (heure de Bruxelles) : on lit les 36 dernières heures et on filtre.
export async function countSentToday(supabase: SupabaseClient, ownerId: string): Promise<number> {
  const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("linkedin_contact_events")
    .select("created_at")
    .eq("owner_id", ownerId)
    .eq("action", "Message envoyé")
    .gte("created_at", since);
  const today = brusselsDate(new Date());
  return ((data as { created_at: string }[] | null) ?? []).filter((e) => brusselsDate(new Date(e.created_at)) === today).length;
}
