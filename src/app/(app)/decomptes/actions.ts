"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";

export type EtapeResult = { ok: true; count: number } | { ok: false; error: string };
export type Etape = "decompte" | "non_paiement" | "a_verifier";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const BUCKET = "payment-proofs";
const MAX_BYTES = 10 * 1024 * 1024;
const MIMES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic"];

async function context() {
  const me = await getCurrentPerson();
  if (!me) return null;
  return { me, svc: createServiceClient() as unknown as SupabaseClient };
}

type PolicyOwner = { id: string; production_month: string | null; client: { owner_id: string } | { owner_id: string }[] | null };

/** Propriétaire (collaborateur) de chaque contrat demandé. */
async function owners(svc: SupabaseClient, ids: string[]): Promise<Map<string, { owner: string; month: string | null }>> {
  const out = new Map<string, { owner: string; month: string | null }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await svc.from("client_policies").select("id, production_month, client:clients!inner(owner_id)").in("id", ids.slice(i, i + 200));
    for (const p of (data as unknown as PolicyOwner[] | null) ?? []) {
      const c = Array.isArray(p.client) ? p.client[0] : p.client;
      if (c) out.set(p.id, { owner: c.owner_id, month: p.production_month });
    }
  }
  return out;
}

/** Vérifie que les contrats existent et que la personne a le droit d'y toucher (administrateur, ou propriétaire). */
async function allowed(svc: SupabaseClient, me: { id: string; is_admin: boolean }, ids: string[]): Promise<string | null> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 2000 || !ids.every((i) => UUID.test(i))) return "Sélection invalide.";
  const own = await owners(svc, ids);
  if (own.size !== new Set(ids).size) return "Contrat introuvable.";
  if (!me.is_admin && [...own.values()].some((o) => o.owner !== me.id)) return "Tu ne peux modifier que tes propres contrats.";
  return null;
}

/**
 * Change l'étape de contrats :
 *  - decompte : premier paiement confirmé, le contrat est décompté sur le mois indiqué ;
 *      un collaborateur doit avoir joint une preuve de paiement ; un administrateur peut le faire sans ;
 *  - non_paiement : premier paiement non effectué (le contrat entre dans Recouvrement) ;
 *  - a_verifier : retour à « Contrat signé » (annule un décompte ou un non-paiement).
 * Un collaborateur ne modifie que ses propres contrats ; un administrateur modifie tout.
 */
export async function changerEtape(ids: string[], etape: Etape, month: string): Promise<EtapeResult> {
  const c = await context();
  if (!c) return { ok: false, error: "Non connecté." };
  const { me, svc } = c;
  if (!MONTH.test(month)) return { ok: false, error: "Mois invalide." };
  const refus = await allowed(svc, me, ids);
  if (refus) return { ok: false, error: refus };

  if (etape === "decompte" && !me.is_admin) {
    const have = new Set<string>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await svc.from("decompte_preuves").select("client_policy_id").in("client_policy_id", ids.slice(i, i + 200));
      for (const r of (data as { client_policy_id: string }[] | null) ?? []) have.add(r.client_policy_id);
    }
    if (ids.some((i) => !have.has(i))) return { ok: false, error: "Joins d'abord la preuve de paiement de chaque contrat." };
  }

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

export type PrepareResult = { ok: true; path: string; token: string } | { ok: false; error: string };

/** Étape 1 du dépôt d'une preuve : le serveur délivre un lien d'envoi à usage unique vers le stockage privé. */
export async function preparerEnvoiPreuve(policyId: string, filename: string, mime: string, size: number): Promise<PrepareResult> {
  const c = await context();
  if (!c) return { ok: false, error: "Non connecté." };
  const refus = await allowed(c.svc, c.me, [policyId]);
  if (refus) return { ok: false, error: refus };
  if (!MIMES.includes(mime)) return { ok: false, error: "Format accepté : PDF, PNG, JPG, WebP ou HEIC." };
  if (!(size > 0) || size > MAX_BYTES) return { ok: false, error: "Fichier trop lourd (10 Mo maximum)." };
  const safe = filename.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80) || "preuve";
  const path = `${policyId}/${crypto.randomUUID()}-${safe}`;
  const { data, error } = await c.svc.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? "Envoi impossible." };
  return { ok: true, path, token: data.token };
}

/** Étape 2 : enregistre la preuve envoyée et, si demandé, décompte le contrat sur le mois indiqué. */
export async function enregistrerPreuve(policyId: string, path: string, filename: string, mime: string, size: number, decompter: boolean, month: string): Promise<EtapeResult> {
  const c = await context();
  if (!c) return { ok: false, error: "Non connecté." };
  const { me, svc } = c;
  const refus = await allowed(svc, me, [policyId]);
  if (refus) return { ok: false, error: refus };
  if (!path.startsWith(`${policyId}/`) || path.includes("..")) return { ok: false, error: "Chemin invalide." };
  const folder = await svc.storage.from(BUCKET).list(policyId, { limit: 200 });
  if (!folder.data?.some((f) => `${policyId}/${f.name}` === path)) return { ok: false, error: "Le fichier n'a pas été reçu : recommence l'envoi." };
  const ins = await svc.from("decompte_preuves").insert({ client_policy_id: policyId, uploaded_by: me.id, path, filename: filename.slice(0, 200), mime, size_bytes: size });
  if (ins.error) return { ok: false, error: ins.error.message };
  revalidatePath("/decomptes");
  if (!decompter) return { ok: true, count: 0 };
  return changerEtape([policyId], "decompte", month);
}

export interface PreuveLien {
  id: string;
  filename: string;
  url: string;
  created_at: string;
  by: string | null;
}

/** Liens temporaires (10 minutes) vers les preuves d'un contrat : administrateur ou collaborateur propriétaire. */
export async function liensPreuves(policyId: string): Promise<{ ok: true; items: PreuveLien[] } | { ok: false; error: string }> {
  const c = await context();
  if (!c) return { ok: false, error: "Non connecté." };
  const refus = await allowed(c.svc, c.me, [policyId]);
  if (refus) return { ok: false, error: refus };
  const { data } = await c.svc.from("decompte_preuves").select("id, filename, path, created_at, uploader:people!uploaded_by(name)").eq("client_policy_id", policyId).order("created_at", { ascending: false });
  const items: PreuveLien[] = [];
  for (const r of (data as unknown as { id: string; filename: string; path: string; created_at: string; uploader: { name: string } | { name: string }[] | null }[] | null) ?? []) {
    const s = await c.svc.storage.from(BUCKET).createSignedUrl(r.path, 600);
    if (!s.data) continue;
    const u = Array.isArray(r.uploader) ? r.uploader[0] : r.uploader;
    items.push({ id: r.id, filename: r.filename, url: s.data.signedUrl, created_at: r.created_at, by: u?.name ?? null });
  }
  return { ok: true, items };
}

/** Correction manuelle du PVQ1 d'un collaborateur pour un mois (administrateur) ; pct = null retire la correction. */
export async function ajusterPvq1(userId: string, month: string, pct: number | null, note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = await context();
  if (!c || !c.me.is_admin) return { ok: false, error: "Réservé à l'administrateur." };
  if (!UUID.test(userId) || !MONTH.test(month)) return { ok: false, error: "Données invalides." };
  if (pct === null) {
    const { error } = await c.svc.from("pvq1_ajustements").delete().eq("user_id", userId).eq("month", month);
    if (error) return { ok: false, error: error.message };
  } else {
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { ok: false, error: "Le PVQ1 doit être entre 0 et 100 %." };
    const { error } = await c.svc
      .from("pvq1_ajustements")
      .upsert({ user_id: userId, month, pct: Math.round(pct * 100) / 100, note: note.trim() || null, updated_by: c.me.id, updated_at: new Date().toISOString() }, { onConflict: "user_id,month" });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/decomptes");
  return { ok: true };
}
