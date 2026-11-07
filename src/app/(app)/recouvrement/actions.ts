"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PolicyInfo = { id: string; client_id: string; client: { id: string; name: string; owner_id: string } | { id: string; name: string; owner_id: string }[] | null };

async function loadPolicy(svc: SupabaseClient, policyId: string) {
  const { data } = await svc.from("client_policies").select("id, client_id, client:clients(id, name, owner_id)").eq("id", policyId).maybeSingle();
  const p = data as unknown as PolicyInfo | null;
  if (!p) return null;
  const client = Array.isArray(p.client) ? p.client[0] : p.client;
  return client ? { id: p.id, clientId: p.client_id, clientName: client.name, ownerId: client.owner_id } : null;
}

export type RetirerResult = { ok: true } | { ok: false; error: string };

/**
 * Le client a payé : le contrat sort du recouvrement. Rien n'est supprimé (ni le contrat, ni le client) :
 * on efface seulement le suivi d'impayé (statut, mensualités impayées, appels, motif, date de relance).
 * L'étape de l'affaire dans « Décomptes » n'est pas modifiée : la preuve de paiement s'y joint comme d'habitude.
 */
export async function retirerPaye(policyId: string): Promise<RetirerResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Non connecté." };
  if (!UUID.test(policyId)) return { ok: false, error: "Contrat invalide." };
  const svc = createServiceClient() as unknown as SupabaseClient;
  const p = await loadPolicy(svc, policyId);
  if (!p) return { ok: false, error: "Contrat introuvable." };
  if (!me.is_admin && p.ownerId !== me.id) return { ok: false, error: "Tu ne peux retirer que tes propres contrats." };

  const { error } = await svc
    .from("client_policies")
    .update({ payment_status: null, unpaid_installments: null, call_1_done: false, call_2_done: false, call_3_done: false, feedback_reason: null, followup_date: null })
    .eq("id", policyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/recouvrement");
  revalidatePath("/");
  return { ok: true };
}

export type AttribuerResult = { ok: true; ownerId: string; ownerName: string } | { ok: false; error: string };

/**
 * Attribue le contrat au collaborateur à qui il appartient réellement : c'est le client (et donc tous ses contrats) qui
 * change de propriétaire, car un contrat appartient à son client. Réservé aux administrateurs. La rémunération des
 * nouveaux est recalculée pour l'ancien et le nouveau propriétaire, comme à chaque modification de contrat.
 */
export async function attribuerClient(policyId: string, newOwnerId: string): Promise<AttribuerResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Non connecté." };
  if (!me.is_admin) return { ok: false, error: "Seul un administrateur peut attribuer un contrat." };
  if (!UUID.test(policyId) || !UUID.test(newOwnerId)) return { ok: false, error: "Données invalides." };
  const svc = createServiceClient() as unknown as SupabaseClient;
  const p = await loadPolicy(svc, policyId);
  if (!p) return { ok: false, error: "Contrat introuvable." };
  const { data: target } = await svc.from("people").select("id, name, active").eq("id", newOwnerId).maybeSingle();
  const t = target as { id: string; name: string; active: boolean | null } | null;
  if (!t || t.active === false) return { ok: false, error: "Collaborateur introuvable ou inactif." };
  if (p.ownerId === t.id) return { ok: true, ownerId: t.id, ownerName: t.name };

  const { error } = await svc.from("clients").update({ owner_id: t.id }).eq("id", p.clientId);
  if (error) return { ok: false, error: error.message };

  for (const user of [p.ownerId, t.id]) {
    try {
      await svc.rpc("remu_recalculer", { p_user: user, p_apply: true });
    } catch {
      // sans effet si la personne n'est pas concernée par la rémunération des nouveaux
    }
  }
  revalidatePath("/recouvrement");
  revalidatePath("/clients");
  revalidatePath("/decomptes");
  return { ok: true, ownerId: t.id, ownerName: t.name };
}
