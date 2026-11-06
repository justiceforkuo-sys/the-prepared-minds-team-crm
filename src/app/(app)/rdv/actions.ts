"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { outcomesFor, prospectStageAfterRdv, type RdvKind, type RdvReport } from "@/lib/rdv";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type RdvSaved = { ok: true; report: RdvReport; patch: Record<string, unknown> } | { ok: false; error: string };
export type RdvList = { ok: true; reports: RdvReport[] } | { ok: false; error: string };

type Me = { id: string; name: string; is_admin: boolean };

async function context(): Promise<{ me: Me; svc: SupabaseClient } | null> {
  const me = await getCurrentPerson();
  return me ? { me: { id: me.id, name: me.name, is_admin: me.is_admin }, svc: createServiceClient() as unknown as SupabaseClient } : null;
}

/** Droit sur un contact : administrateur, responsable du contact ; pour un prospect, aussi la liste partagée (lecture ou modification). */
async function access(svc: SupabaseClient, me: Me, kind: RdvKind, id: string, write: boolean): Promise<{ row: Record<string, unknown> } | { error: string }> {
  if (kind === "prospect") {
    const { data } = await svc.from("prospects").select("id, owner_id, list_id, stage, next_follow_up").eq("id", id).maybeSingle();
    const p = data as { id: string; owner_id: string; list_id: string | null; stage: string; next_follow_up: string | null } | null;
    if (!p) return { error: "Prospect introuvable." };
    let ok = me.is_admin || p.owner_id === me.id;
    if (!ok && p.list_id) {
      const { data: s } = await svc.from("prospect_list_shares").select("can_edit").eq("list_id", p.list_id).eq("person_id", me.id).maybeSingle();
      const share = s as { can_edit: boolean } | null;
      ok = !!share && (!write || share.can_edit);
    }
    return ok ? { row: p } : { error: "Tu n'as pas accès à ce prospect." };
  }
  const { data } = await svc.from("recruitment_applications").select("id, owner_id, recruiter_id, status, status_reason").eq("id", id).maybeSingle();
  const c = data as { id: string; owner_id: string | null; recruiter_id: string | null; status: string; status_reason: string | null } | null;
  if (!c) return { error: "Candidature introuvable." };
  return me.is_admin || c.owner_id === me.id || c.recruiter_id === me.id ? { row: c } : { error: "Tu n'as pas accès à cette candidature." };
}

async function namesOf(svc: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await svc.from("people").select("id, name");
  return Object.fromEntries(((data as { id: string; name: string }[] | null) ?? []).map((p) => [p.id, p.name]));
}

export interface RdvInput {
  kind: RdvKind;
  contactId: string;
  outcome: string;
  note: string;
  viaVoice: boolean;
  nextFollowUp: string | null;
}

/** Enregistre le compte rendu d'un rendez-vous effectué et fait avancer le contact selon le résultat. */
export async function enregistrerRdv(input: RdvInput): Promise<RdvSaved> {
  const c = await context();
  if (!c) return { ok: false, error: "Session expirée." };
  const { me, svc } = c;
  if (!UUID.test(input.contactId) || (input.kind !== "prospect" && input.kind !== "candidat")) return { ok: false, error: "Données invalides." };
  if (!outcomesFor(input.kind).includes(input.outcome)) return { ok: false, error: "Résultat invalide." };
  const note = input.note.trim();
  if (note.length > 4000) return { ok: false, error: "Remarque trop longue (4 000 caractères maximum)." };
  if (input.nextFollowUp !== null && (!DATE.test(input.nextFollowUp) || input.nextFollowUp < "2020-01-01" || input.nextFollowUp > "2100-12-31")) return { ok: false, error: "Date de relance invalide." };

  const acc = await access(svc, me, input.kind, input.contactId, true);
  if ("error" in acc) return { ok: false, error: acc.error };
  const today = toISO(brusselsNow());

  const ins = await svc
    .from("rdv_reports")
    .insert({
      author_id: me.id,
      prospect_id: input.kind === "prospect" ? input.contactId : null,
      application_id: input.kind === "candidat" ? input.contactId : null,
      happened_on: today,
      outcome: input.outcome,
      note: note || null,
      via_voice: !!input.viaVoice,
      next_follow_up: input.nextFollowUp,
    })
    .select("id, author_id, happened_on, outcome, note, via_voice, next_follow_up, created_at")
    .single();
  if (ins.error || !ins.data) return { ok: false, error: ins.error?.message ?? "Enregistrement impossible." };
  const report: RdvReport = { ...(ins.data as Omit<RdvReport, "author_name">), author_name: me.name };

  const patch: Record<string, unknown> = {};
  if (input.kind === "prospect") {
    const row = acc.row as { stage: string; next_follow_up: string | null };
    const stage = prospectStageAfterRdv(row.stage, input.outcome);
    if (stage) patch.stage = stage;
    if (input.nextFollowUp !== null) patch.next_follow_up = input.nextFollowUp;
    if (Object.keys(patch).length) {
      const up = await svc.from("prospects").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", input.contactId);
      if (up.error) return { ok: false, error: up.error.message };
    }
  } else {
    const row = acc.row as { status: string };
    if (!["Intégré", "Actif 90 j"].includes(row.status)) {
      if (input.outcome === "Profil retenu") Object.assign(patch, { status: "Retenu", next_action: "Lancer l'onboarding", next_action_date: input.nextFollowUp ?? today });
      else if (input.outcome === "Pas retenu") Object.assign(patch, { status: "Rejeté", status_reason: note || null, next_action: null, next_action_date: null });
      else Object.assign(patch, { next_action: input.outcome === "À revoir" ? "Décider après l'entretien" : "Reprogrammer l'entretien", next_action_date: input.nextFollowUp });
      if (patch.status && patch.status !== row.status) patch.stage_changed_at = new Date().toISOString();
      const up = await svc.from("recruitment_applications").update(patch).eq("id", input.contactId);
      if (up.error) return { ok: false, error: up.error.message };
    }
  }
  revalidatePath("/appels");
  return { ok: true, report, patch };
}

/** Historique des comptes rendus d'un contact (administrateurs, responsable du contact, auteurs). */
export async function listerRdv(kind: RdvKind, contactId: string): Promise<RdvList> {
  const c = await context();
  if (!c) return { ok: false, error: "Session expirée." };
  if (!UUID.test(contactId)) return { ok: false, error: "Données invalides." };
  const acc = await access(c.svc, c.me, kind, contactId, false);
  if ("error" in acc) return { ok: false, error: acc.error };
  const { data, error } = await c.svc
    .from("rdv_reports")
    .select("id, author_id, happened_on, outcome, note, via_voice, next_follow_up, created_at")
    .eq(kind === "prospect" ? "prospect_id" : "application_id", contactId)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  const names = await namesOf(c.svc);
  return { ok: true, reports: ((data as Omit<RdvReport, "author_name">[] | null) ?? []).map((r) => ({ ...r, author_name: names[r.author_id] ?? "?" })) };
}
