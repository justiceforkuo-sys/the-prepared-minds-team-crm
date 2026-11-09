"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { ASK_OBJECTION, CALL_OUTCOMES, stageAfterCall, type CallOutcome } from "@/lib/calls";

export type AppelResult = { ok: true; stage: string; nextFollowUp: string | null; callId: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Enregistre un appel passé à un prospect (le sien, ou celui d'une liste partagée en modification),
 * met à jour son étape selon le résultat et, pour « À rappeler », fixe la date de relance (demain par défaut).
 */
export async function enregistrerAppel(prospectId: string, outcome: string, note: string, followUp: string | null): Promise<AppelResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Non connecté." };
  if (!UUID.test(prospectId) || !(CALL_OUTCOMES as readonly string[]).includes(outcome)) return { ok: false, error: "Données invalides." };
  if (note.length > 500) return { ok: false, error: "Note trop longue." };
  if (followUp !== null && (!DATE.test(followUp) || followUp < "2020-01-01" || followUp > "2100-12-31")) return { ok: false, error: "Date de relance invalide." };
  const svc = createServiceClient() as unknown as SupabaseClient;

  const { data } = await svc.from("prospects").select("id, owner_id, list_id, stage, next_follow_up").eq("id", prospectId).maybeSingle();
  const p = data as { id: string; owner_id: string; list_id: string | null; stage: string; next_follow_up: string | null } | null;
  if (!p) return { ok: false, error: "Prospect introuvable." };

  let allowed = p.owner_id === me.id;
  if (!allowed && p.list_id) {
    const { data: share } = await svc.from("prospect_list_shares").select("can_edit").eq("list_id", p.list_id).eq("person_id", me.id).maybeSingle();
    allowed = !!(share as { can_edit: boolean } | null)?.can_edit;
  }
  if (!allowed) return { ok: false, error: "Tu n'as pas le droit de modifier ce prospect." };

  const ins = await svc.from("call_log").insert({ person_id: me.id, prospect_id: p.id, list_id: p.list_id, outcome, note: note.trim() || null }).select("id").single();
  if (ins.error || !ins.data) return { ok: false, error: ins.error?.message ?? "Enregistrement impossible." };

  const o = outcome as CallOutcome;
  const newStage = stageAfterCall(p.stage, o);
  let nextFollowUp = p.next_follow_up;
  if (o === "À rappeler") {
    const t = brusselsNow();
    t.setDate(t.getDate() + 1);
    nextFollowUp = followUp ?? toISO(t);
  }
  const update: Record<string, unknown> = {};
  if (newStage) update.stage = newStage;
  if (nextFollowUp !== p.next_follow_up) update.next_follow_up = nextFollowUp;
  if (Object.keys(update).length > 0) {
    update.updated_at = new Date().toISOString();
    const up = await svc.from("prospects").update(update).eq("id", p.id);
    if (up.error) return { ok: false, error: up.error.message };
  }
  revalidatePath("/appels");
  return { ok: true, stage: newStage ?? p.stage, nextFollowUp, callId: (ins.data as { id: string }).id };
}

// ---------------------------------------------------------------------------
// Bloc 10 : objection entendue après un appel joint sans RDV
// ---------------------------------------------------------------------------

export interface ObjectionChoix {
  id: string;
  libelle: string;
  reponse: string | null;
}

/** Les objections validées de la banque de l'équipe (les brouillons restent réservés aux administrateurs). */
export async function chargerObjections(): Promise<ObjectionChoix[]> {
  const me = await getCurrentPerson();
  if (!me) return [];
  const svc = createServiceClient() as unknown as SupabaseClient;
  const { data } = await svc.from("objections").select("id, libelle, reponse_equipe").eq("validee", true).order("ordre");
  return ((data as { id: string; libelle: string; reponse_equipe: string | null }[] | null) ?? []).map((o) => ({ id: o.id, libelle: o.libelle, reponse: o.reponse_equipe }));
}

const fold = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export type ObjectionResult = { ok: true; reponse: string | null } | { ok: false; error: string };

/**
 * Note l'objection d'un appel déjà enregistré : soit une objection de la banque, soit « Autre » avec les mots exacts.
 * RGPD : seuls les mots de l'objection sont gardés, sans nom ; un nom de prospect, un e-mail ou un numéro est refusé.
 */
export async function noterObjection(callId: string, objectionId: string | null, mots: string): Promise<ObjectionResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Non connecté." };
  if (!UUID.test(callId) || (objectionId !== null && !UUID.test(objectionId))) return { ok: false, error: "Données invalides." };
  const words = mots.trim();
  if (words.length > 200) return { ok: false, error: "200 caractères maximum : garde seulement les mots de la personne." };
  if (objectionId === null && words.length < 3) return { ok: false, error: "Note les mots de la personne." };
  const svc = createServiceClient() as unknown as SupabaseClient;

  const { data: call } = await svc.from("call_log").select("id, person_id, outcome").eq("id", callId).maybeSingle();
  const c = call as { id: string; person_id: string; outcome: string } | null;
  if (!c || c.person_id !== me.id) return { ok: false, error: "Appel introuvable." };
  if (!(ASK_OBJECTION as string[]).includes(c.outcome)) return { ok: false, error: "Cet appel ne demande pas d'objection." };

  let reponse: string | null = null;
  if (objectionId) {
    const { data: o } = await svc.from("objections").select("id, validee, reponse_equipe").eq("id", objectionId).maybeSingle();
    const ob = o as { id: string; validee: boolean; reponse_equipe: string | null } | null;
    if (!ob || !ob.validee) return { ok: false, error: "Objection introuvable." };
    reponse = ob.reponse_equipe;
  }

  if (words) {
    if (/@|\d[\d\s./-]{6,}/.test(words)) return { ok: false, error: "Retire l'e-mail ou le numéro : note seulement les mots de la personne." };
    const { data: names } = await svc.from("prospects").select("name").eq("owner_id", me.id).limit(5000);
    const text = ` ${fold(words)} `;
    for (const r of (names as { name: string }[] | null) ?? []) {
      const n = fold(r.name ?? "");
      if (n.length >= 5 && text.includes(` ${n} `)) return { ok: false, error: "Retire le nom de la personne : note seulement ses mots." };
    }
  }

  const up = await svc.from("call_log").update({ objection_id: objectionId, objection_mots: words || null }).eq("id", callId);
  if (up.error) return { ok: false, error: up.error.message };
  revalidatePath("/appels");
  return { ok: true, reponse };
}
