"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";

export type EtapeResult = { ok: true; count: number } | { ok: false; error: string };
export type Etape = "decompte" | "non_paiement" | "a_verifier";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Change l'étape de contrats (administrateur seulement) :
 *  - decompte : premier paiement confirmé, le contrat est décompté sur le mois indiqué ;
 *  - non_paiement : premier paiement non effectué (le contrat entre dans Recouvrement) ;
 *  - a_verifier : retour à « Contrat signé » (annule un décompte ou un non-paiement).
 */
export async function changerEtape(ids: string[], etape: Etape, month: string): Promise<EtapeResult> {
  const me = await getCurrentPerson();
  if (!me || !me.is_admin) return { ok: false, error: "Réservé à l'administrateur." };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 2000 || !ids.every((i) => UUID.test(i))) return { ok: false, error: "Sélection invalide." };
  if (!MONTH.test(month)) return { ok: false, error: "Mois invalide." };
  const svc = createServiceClient() as unknown as SupabaseClient;

  const patch =
    etape === "decompte"
      ? { deal_stage: "Décompté", decompte_month: month, decompted_at: new Date().toISOString() }
      : etape === "non_paiement"
        ? { deal_stage: "Non paiement", decompte_month: null, decompted_at: null }
        : { deal_stage: "Contrat signé", decompte_month: null, decompted_at: null };

  let count = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error, count: n } = await svc.from("client_policies").update(patch, { count: "exact" }).in("id", chunk);
    if (error) return { ok: false, error: error.message };
    count += n ?? 0;
    if (etape === "non_paiement") {
      // un contrat non payé entre dans le circuit de recouvrement s'il n'y était pas déjà
      const r = await svc.from("client_policies").update({ payment_status: "À contacter" }).in("id", chunk).is("payment_status", null);
      if (r.error) return { ok: false, error: r.error.message };
    }
  }
  revalidatePath("/decomptes");
  revalidatePath("/recouvrement");
  return { ok: true, count };
}
