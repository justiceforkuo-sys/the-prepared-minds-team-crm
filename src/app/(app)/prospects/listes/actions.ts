"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";

export type ListeResult = { ok: true; message?: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LIST_STAGES = ["À contacter", "Contacté", "Répondu", "RDV pris", "Entretien / Dossier", "Perdu"] as const;

async function context() {
  const me = await getCurrentPerson();
  if (!me) return null;
  return { me, svc: createServiceClient() as unknown as SupabaseClient };
}

type Role = "owner" | "edit" | "read";

/** Droit de la personne sur une liste : propriétaire, modification, lecture, ou rien. */
async function roleOn(svc: SupabaseClient, meId: string, listId: string): Promise<Role | null> {
  const { data: list } = await svc.from("prospect_lists").select("id, owner_id").eq("id", listId).maybeSingle();
  const l = list as { id: string; owner_id: string } | null;
  if (!l) return null;
  if (l.owner_id === meId) return "owner";
  const { data: share } = await svc.from("prospect_list_shares").select("can_edit").eq("list_id", listId).eq("person_id", meId).maybeSingle();
  const s = share as { can_edit: boolean } | null;
  return s ? (s.can_edit ? "edit" : "read") : null;
}

/** Partage une liste avec une personne (propriétaire seulement) ; peut_modifier = false : lecture seule. */
export async function partagerListe(listId: string, personId: string, canEdit: boolean): Promise<ListeResult> {
  const c = await context();
  if (!c) return { ok: false, error: "Non connecté." };
  if (!UUID.test(listId) || !UUID.test(personId)) return { ok: false, error: "Données invalides." };
  if ((await roleOn(c.svc, c.me.id, listId)) !== "owner") return { ok: false, error: "Seul le propriétaire de la liste peut la partager." };
  if (personId === c.me.id) return { ok: false, error: "La liste est déjà à toi." };
  const { data: person } = await c.svc.from("people").select("id, active").eq("id", personId).maybeSingle();
  if (!person || !(person as { active: boolean }).active) return { ok: false, error: "Collaborateur introuvable ou inactif." };
  const { error } = await c.svc.from("prospect_list_shares").upsert({ list_id: listId, person_id: personId, can_edit: !!canEdit }, { onConflict: "list_id,person_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/prospects/listes");
  return { ok: true };
}

export async function retirerPartage(listId: string, personId: string): Promise<ListeResult> {
  const c = await context();
  if (!c) return { ok: false, error: "Non connecté." };
  if (!UUID.test(listId) || !UUID.test(personId)) return { ok: false, error: "Données invalides." };
  if ((await roleOn(c.svc, c.me.id, listId)) !== "owner") return { ok: false, error: "Seul le propriétaire de la liste peut retirer un partage." };
  const { error } = await c.svc.from("prospect_list_shares").delete().eq("list_id", listId).eq("person_id", personId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/prospects/listes");
  return { ok: true };
}

const FICHE_TEXT_LIMITS = {
  recommended_by: 120,
  relation: 120,
  etat_civil: 120,
  travail: 120,
  region: 120,
  remarque: 500,
  commentaire: 3000,
} as const;
type FicheTextField = keyof typeof FICHE_TEXT_LIMITS;
const TYPES_ACTION = ["DV", "DR", "AR"] as const;

export interface ProspectPatch {
  stage?: string;
  notes?: string;
  next_follow_up?: string | null;
  recommended_by?: string;
  relation?: string;
  etat_civil?: string;
  travail?: string;
  region?: string;
  remarque?: string;
  commentaire?: string;
  type_action?: "DV" | "DR" | "AR" | null;
  contact_date?: string | null;
}

/** Met à jour l'étape, la note, la date de relance ou les colonnes de la feuille de recommandations d'un prospect d'une liste (propriétaire, ou partage en modification). */
export async function modifierProspectListe(prospectId: string, patch: ProspectPatch): Promise<ListeResult> {
  const c = await context();
  if (!c) return { ok: false, error: "Non connecté." };
  if (!UUID.test(prospectId)) return { ok: false, error: "Prospect invalide." };
  const { data } = await c.svc.from("prospects").select("id, owner_id, list_id").eq("id", prospectId).maybeSingle();
  const p = data as { id: string; owner_id: string; list_id: string | null } | null;
  if (!p || !p.list_id) return { ok: false, error: "Prospect introuvable dans une liste." };
  const role = await roleOn(c.svc, c.me.id, p.list_id);
  if (role !== "owner" && role !== "edit") return { ok: false, error: "Tu n'as pas le droit de modifier cette liste." };

  const update: Record<string, unknown> = {};
  if (patch.stage !== undefined) {
    if (!(LIST_STAGES as readonly string[]).includes(patch.stage)) return { ok: false, error: "Étape invalide." };
    update.stage = patch.stage;
  }
  if (patch.notes !== undefined) {
    if (patch.notes.length > 3000) return { ok: false, error: "Note trop longue." };
    update.notes = patch.notes.trim() || null;
  }
  if (patch.next_follow_up !== undefined) {
    if (patch.next_follow_up !== null && (!DATE.test(patch.next_follow_up) || patch.next_follow_up < "2020-01-01" || patch.next_follow_up > "2100-12-31")) return { ok: false, error: "Date invalide." };
    update.next_follow_up = patch.next_follow_up;
  }
  for (const f of Object.keys(FICHE_TEXT_LIMITS) as FicheTextField[]) {
    const v = patch[f];
    if (v === undefined) continue;
    if (typeof v !== "string" || v.length > FICHE_TEXT_LIMITS[f]) return { ok: false, error: "Texte trop long." };
    update[f] = v.trim() || null;
  }
  if (patch.type_action !== undefined) {
    if (patch.type_action !== null && !(TYPES_ACTION as readonly string[]).includes(patch.type_action)) return { ok: false, error: "Type invalide (DV, DR ou AR)." };
    update.type_action = patch.type_action;
  }
  if (patch.contact_date !== undefined) {
    if (patch.contact_date !== null && (!DATE.test(patch.contact_date) || patch.contact_date < "2020-01-01" || patch.contact_date > "2100-12-31")) return { ok: false, error: "Date invalide." };
    update.contact_date = patch.contact_date;
  }
  if (Object.keys(update).length === 0) return { ok: true };
  update.updated_at = new Date().toISOString();
  const { error } = await c.svc.from("prospects").update(update).eq("id", prospectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
