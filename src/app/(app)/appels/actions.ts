"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { CALL_OUTCOMES, stageAfterCall, type CallOutcome } from "@/lib/calls";

export type AppelResult = { ok: true; stage: string; nextFollowUp: string | null } | { ok: false; error: string };

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

  const ins = await svc.from("call_log").insert({ person_id: me.id, prospect_id: p.id, list_id: p.list_id, outcome, note: note.trim() || null });
  if (ins.error) return { ok: false, error: ins.error.message };

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
  return { ok: true, stage: newStage ?? p.stage, nextFollowUp };
}
