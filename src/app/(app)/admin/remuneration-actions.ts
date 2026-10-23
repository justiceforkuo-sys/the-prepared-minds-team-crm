"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";

export interface RemuPreview {
  clients: number;
  forfaits: number;
  unites_cumulees: number;
  reserve: number;
  unites_par_rang: Record<string, number>;
  rattrapage_si_agrement_aujourdhui: number;
  rattrapage_calcule: number | null;
  agrement: string | null;
}

export type RemuResult = { ok: true; message?: string; preview?: RemuPreview } | { ok: false; error: string };

async function adminContext() {
  const me = await getCurrentPerson();
  if (!me || !me.is_admin) return null;
  return createServiceClient() as unknown as SupabaseClient;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Simulation : ce que donnerait le recalcul de l'historique, sans rien écrire. */
export async function apercuRemuneration(userId: string): Promise<RemuResult> {
  const service = await adminContext();
  if (!service) return { ok: false, error: "Réservé à l'administrateur." };
  const { data, error } = await service.rpc("remu_recalculer", { p_user: userId, p_apply: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, preview: data as RemuPreview };
}

/** Place la personne dans le nouveau système (date de démarrage >= 1er septembre 2025) et recalcule son historique. */
export async function appliquerRemuneration(userId: string, dateDemarrage: string): Promise<RemuResult> {
  const service = await adminContext();
  if (!service) return { ok: false, error: "Réservé à l'administrateur." };
  if (!DATE.test(dateDemarrage) || dateDemarrage < "2025-09-01") return { ok: false, error: "La date de démarrage doit être le 1er septembre 2025 ou après." };
  const up = await service.from("people").update({ date_demarrage: dateDemarrage }).eq("id", userId);
  if (up.error) return { ok: false, error: up.error.message };
  const { data, error } = await service.rpc("remu_recalculer", { p_user: userId, p_apply: true });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/revenus");
  return { ok: true, message: "Historique recalculé et enregistré.", preview: data as RemuPreview };
}

export async function recalculerRemuneration(userId: string): Promise<RemuResult> {
  const service = await adminContext();
  if (!service) return { ok: false, error: "Réservé à l'administrateur." };
  const { data, error } = await service.rpc("remu_recalculer", { p_user: userId, p_apply: true });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/revenus");
  return { ok: true, message: "Recalcul effectué.", preview: data as RemuPreview };
}

/** Marque tous les forfaits clients encore impayés de la personne comme payés à une date. */
export async function marquerForfaitsPayes(userId: string, date: string): Promise<RemuResult> {
  const service = await adminContext();
  if (!service) return { ok: false, error: "Réservé à l'administrateur." };
  if (!DATE.test(date)) return { ok: false, error: "Date invalide." };
  const { error, count } = await service
    .from("forfaits_clients")
    .update({ paye_le: date }, { count: "exact" })
    .eq("user_id", userId)
    .is("paye_le", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/revenus");
  return { ok: true, message: `${count ?? 0} forfait(s) marqué(s) payé(s).` };
}

export async function marquerRattrapageVerse(userId: string, date: string): Promise<RemuResult> {
  const service = await adminContext();
  if (!service) return { ok: false, error: "Réservé à l'administrateur." };
  if (!DATE.test(date)) return { ok: false, error: "Date invalide." };
  const { error, count } = await service.from("rattrapages").update({ verse_le: date }, { count: "exact" }).eq("user_id", userId).is("verse_le", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/revenus");
  revalidatePath("/");
  return { ok: true, message: count ? "Rattrapage marqué comme versé." : "Rien à marquer." };
}

export interface RemuManuelInput {
  dateDemarrage: string;
  nbClients: number;
  forfaitsTotal: number;
  forfaitsPayes: number;
  unites: number;
  reserve: number;
  rattrapage: number | null;
  note: string;
}

const money = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 10_000_000;

/** Encode à la main la rémunération d'une personne : ces valeurs remplacent le calcul automatique. */
export async function enregistrerRemuManuel(userId: string, v: RemuManuelInput): Promise<RemuResult> {
  const service = await adminContext();
  if (!service) return { ok: false, error: "Réservé à l'administrateur." };
  if (!DATE.test(v.dateDemarrage) || v.dateDemarrage < "2025-09-01") return { ok: false, error: "La date de début doit être le 1er septembre 2025 ou après." };
  if (!Number.isInteger(v.nbClients) || v.nbClients < 0 || v.nbClients > 100000) return { ok: false, error: "Nombre de clients invalide." };
  if (![v.forfaitsTotal, v.forfaitsPayes, v.unites, v.reserve].every(money) || (v.rattrapage !== null && !money(v.rattrapage))) return { ok: false, error: "Un des montants est invalide." };
  if (v.forfaitsPayes > v.forfaitsTotal) return { ok: false, error: "Les forfaits payés dépassent les forfaits dus." };
  const up = await service.from("people").update({ date_demarrage: v.dateDemarrage }).eq("id", userId);
  if (up.error) return { ok: false, error: up.error.message };
  const { error } = await service.from("remu_manuel").upsert(
    {
      user_id: userId,
      nb_clients: v.nbClients,
      forfaits_total: v.forfaitsTotal,
      forfaits_payes: v.forfaitsPayes,
      unites: v.unites,
      reserve: v.reserve,
      rattrapage: v.rattrapage,
      note: v.note.trim() || null,
      maj_le: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/revenus");
  revalidatePath("/");
  return { ok: true, message: "Valeurs encodées enregistrées." };
}

/** Supprime la saisie manuelle : le CRM revient au calcul automatique. */
export async function retablirCalculAutomatique(userId: string): Promise<RemuResult> {
  const service = await adminContext();
  if (!service) return { ok: false, error: "Réservé à l'administrateur." };
  const { error } = await service.from("remu_manuel").delete().eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/revenus");
  revalidatePath("/");
  return { ok: true, message: "Retour au calcul automatique." };
}
