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

export interface ProspectPatch {
  stage?: string;
  notes?: string;
  next_follow_up?: string | null;
}

/** Met à jour l'étape, la note ou la date de relance d'un prospect d'une liste (propriétaire, ou partage en modification). */
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
  if (Object.keys(update).length === 0) return { ok: true };
  update.updated_at = new Date().toISOString();
  const { error } = await c.svc.from("prospects").update(update).eq("id", prospectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
