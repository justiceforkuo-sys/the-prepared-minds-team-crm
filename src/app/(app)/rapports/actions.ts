"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { aujourdhuiBxl, genererTous, type RapportRow } from "@/lib/rapport-hebdo-gen";
import { envoyerRapportEmail } from "@/lib/email/send-rapport-hebdo";
import { equipeDe } from "@/lib/equipe";

export type RapportResult = { ok: true; message: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function contexte() {
  const me = await getCurrentPerson();
  if (!me) return null;
  return { me, svc: createServiceClient() as unknown as SupabaseClient };
}

async function rapportGerable(c: NonNullable<Awaited<ReturnType<typeof contexte>>>, id: string): Promise<{ r: RapportRow } | { error: string }> {
  if (!UUID.test(id)) return { error: "Rapport invalide." };
  const { data } = await c.svc.from("rapports_hebdo").select("*").eq("id", id).maybeSingle();
  const r = data as RapportRow | null;
  if (!r) return { error: "Rapport introuvable." };
  if (r.person_id === c.me.id) return { error: "Tu ne peux pas valider ton propre rapport." };
  if (!c.me.is_admin && !(await equipeDe(c.svc, c.me.id)).has(r.person_id)) return { error: "Ce rapport n'est pas dans ton équipe." };
  return { r };
}

/** Publie un rapport « à valider » : la personne le voit dans « Mon rapport » (et le reçoit par email si l'envoi est activé). */
export async function publierRapport(id: string): Promise<RapportResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Non connecté." };
  const g = await rapportGerable(c, id);
  if ("error" in g) return { ok: false, error: g.error };
  if (g.r.statut !== "a_valider") return { ok: false, error: "Ce rapport n'est plus à valider." };
  const { error } = await c.svc.from("rapports_hebdo").update({ statut: "envoye", envoye_at: new Date().toISOString(), envoye_par: c.me.id }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  const mail = await envoyerRapportEmail(c.svc, g.r).catch((e: unknown) => ({ sent: false, reason: e instanceof Error ? e.message : "erreur" }));
  revalidatePath("/rapports");
  return { ok: true, message: mail.sent ? "Rapport publié et envoyé par email." : `Rapport publié dans le CRM (email : ${mail.reason}).` };
}

export async function ignorerRapport(id: string): Promise<RapportResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Non connecté." };
  const g = await rapportGerable(c, id);
  if ("error" in g) return { ok: false, error: g.error };
  if (g.r.statut !== "a_valider") return { ok: false, error: "Ce rapport n'est plus à valider." };
  const { error } = await c.svc.from("rapports_hebdo").update({ statut: "ignore" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rapports");
  return { ok: true, message: "Rapport ignoré : il ne sera ni publié ni compté." };
}

/** Prépare maintenant les rapports de tout le monde (administrateur). Tout part en « à valider » : rien n'est publié sans relecture. */
export async function genererSemaine(): Promise<RapportResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Non connecté." };
  if (!c.me.is_admin) return { ok: false, error: "Réservé aux administrateurs." };
  const res = await genererTous(c.svc, aujourdhuiBxl(), true);
  revalidatePath("/rapports");
  const err = res.erreurs.length ? ` Erreurs : ${res.erreurs.join(" ; ")}.` : "";
  return { ok: true, message: `${res.crees} rapport${res.crees > 1 ? "s" : ""} préparé${res.crees > 1 ? "s" : ""} (à valider), ${res.existants} déjà existant${res.existants > 1 ? "s" : ""}.${err}` };
}

/** Envoie à l'administrateur (à son adresse seulement) le dernier rapport d'une personne, pour voir l'email tel qu'il sera reçu. */
export async function envoyerTestRapport(personId: string): Promise<RapportResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Non connecté." };
  if (!c.me.is_admin) return { ok: false, error: "Réservé aux administrateurs." };
  if (!UUID.test(personId)) return { ok: false, error: "Personne invalide." };
  if (!c.me.email) return { ok: false, error: "Ta fiche n'a pas d'adresse email." };
  const { data } = await c.svc.from("rapports_hebdo").select("*").eq("person_id", personId).neq("statut", "ignore").order("semaine", { ascending: false }).limit(1);
  const r = ((data as RapportRow[] | null) ?? [])[0];
  if (!r) return { ok: false, error: "Aucun rapport pour cette personne." };
  const res = await envoyerRapportEmail(c.svc, r, { versEmail: c.me.email }).catch((e: unknown) => ({ sent: false, reason: e instanceof Error ? e.message : "erreur" }));
  return res.sent ? { ok: true, message: `Email de test envoyé à ${c.me.email}.` } : { ok: false, error: `Email non envoyé : ${res.reason}` };
}

/** Suspend ou rétablit le rapport du vendredi d'une personne (vacances, maladie, arrêt) : administrateur seulement. */
export async function basculerSuivi(personId: string, actif: boolean): Promise<RapportResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Non connecté." };
  if (!c.me.is_admin) return { ok: false, error: "Réservé aux administrateurs." };
  if (!UUID.test(personId) || personId === c.me.id) return { ok: false, error: "Personne invalide." };
  const { error } = await c.svc.from("people").update({ rapport_hebdo: !!actif }).eq("id", personId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rapports");
  return { ok: true, message: actif ? "Rapport du vendredi rétabli." : "Rapport du vendredi suspendu." };
}
