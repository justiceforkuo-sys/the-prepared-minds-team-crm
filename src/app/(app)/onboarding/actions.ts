"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { FSMA_MODULES, type AgrementStatut, type FsmaModule, type ModuleStatut } from "@/lib/parcours";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const NOT_YET = "À valider après l'agrément FSMA.";

async function context() {
  const me = await getCurrentPerson();
  if (!me) return null;
  const service = createServiceClient() as unknown as SupabaseClient;
  return { me, service, supabase: await createClient() };
}

/** Le lecteur peut-il agir comme mentor sur cette personne ? (admin, ou personne de sa cascade) */
async function canManage(ctx: NonNullable<Awaited<ReturnType<typeof context>>>, targetId: string): Promise<boolean> {
  if (ctx.me.is_admin) return true;
  if (targetId === ctx.me.id) return false;
  const { data } = await ctx.supabase.rpc("is_downline_of", { target_id: targetId, root_id: ctx.me.id });
  return data === true;
}

const today = () => toISO(brusselsNow());

/** Le nouveau marque lui-même une étape comme faite (ou annule). Les étapes automatiques ne passent pas par ici. */
export async function toggleStepDone(etapeId: string): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  const { data: existing } = await ctx.service.from("parcours_progression").select("*").eq("user_id", ctx.me.id).eq("etape_id", etapeId).maybeSingle();
  if (existing?.valide_at) return { ok: false, error: "Cette étape est déjà validée par ton mentor." };
  const { error } = await ctx.service.from("parcours_progression").upsert(
    { user_id: ctx.me.id, etape_id: etapeId, fait_at: existing?.fait_at ? null : new Date().toISOString() },
    { onConflict: "user_id,etape_id" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/onboarding");
  return { ok: true };
}

/** Le mentor (ou l'admin) valide / dévalide des étapes. Garde-fou réglementaire : pas de validation « en autonomie » avant l'agrément. */
export async function validateSteps(userId: string, etapeIds: string[], validated: boolean): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  if (!(await canManage(ctx, userId))) return { ok: false, error: "Seul son mentor peut valider ces étapes." };

  const [{ data: target }, { data: etapes }] = await Promise.all([
    ctx.service.from("people").select("statut_reglementaire").eq("id", userId).single(),
    ctx.service.from("parcours_etapes").select("id, necessite_agrement, titre").in("id", etapeIds),
  ]);
  const agree = target?.statut_reglementaire === "agree_fsma";
  const blocked = validated ? (etapes ?? []).filter((e) => e.necessite_agrement && !agree) : [];
  const allowed = (etapes ?? []).filter((e) => !blocked.some((b) => b.id === e.id));

  if (allowed.length > 0) {
    const rows = allowed.map((e) => ({
      user_id: userId,
      etape_id: e.id,
      valide_at: validated ? new Date().toISOString() : null,
      valide_par: validated ? ctx.me.id : null,
    }));
    const { error } = await ctx.service.from("parcours_progression").upsert(rows, { onConflict: "user_id,etape_id" });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/onboarding");
  if (blocked.length > 0) {
    return allowed.length > 0 ? { ok: true, message: `${allowed.length} étape(s) validée(s). ${NOT_YET}` } : { ok: false, error: NOT_YET };
  }
  return { ok: true };
}

/** Badge « Autonome » : posé quand les 8 points de la validation finale sont acquis (jamais avant l'agrément). */
export async function setAutonome(userId: string, on: boolean): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  if (!(await canManage(ctx, userId))) return { ok: false, error: "Non autorisé." };
  if (on) {
    const { data: target } = await ctx.service.from("people").select("statut_reglementaire").eq("id", userId).single();
    if (target?.statut_reglementaire !== "agree_fsma") return { ok: false, error: NOT_YET };
  }
  const { error } = await ctx.service.from("people").update({ autonome_at: on ? today() : null }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/onboarding");
  return { ok: true };
}

/** Modules FSMA : le nouveau passe « à faire / en cours » ; « réussi » est posé par le mentor ou l'admin. */
export async function setModule(userId: string, module: FsmaModule, statut: ModuleStatut, date?: string): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  if (!FSMA_MODULES.includes(module)) return { ok: false, error: "Module inconnu." };
  const manager = await canManage(ctx, userId);
  const self = userId === ctx.me.id;
  if (!manager && !(self && statut !== "reussi")) return { ok: false, error: "Seul ton mentor peut marquer un module comme réussi." };
  const { error } = await ctx.service.from("modules_fsma").upsert(
    { user_id: userId, module, statut, reussi_at: statut === "reussi" ? date || today() : null },
    { onConflict: "user_id,module" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/onboarding");
  return { ok: true };
}

/** Dossier d'agrément : « déposé » par le mentor ou l'admin, « obtenu » par l'admin uniquement (met à jour le statut réglementaire). */
export async function setAgrement(userId: string, statut: AgrementStatut): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  if (statut === "obtenu" && !ctx.me.is_admin) return { ok: false, error: "Seul un administrateur peut marquer l'agrément comme obtenu." };
  if (!(await canManage(ctx, userId))) return { ok: false, error: "Non autorisé." };
  const patch: Record<string, unknown> =
    statut === "obtenu"
      ? { agrement_statut: "obtenu", agrement_fsma_at: today(), statut_reglementaire: "agree_fsma" }
      : statut === "depose"
        ? { agrement_statut: "depose", agrement_depose_at: today(), agrement_fsma_at: null, statut_reglementaire: "en_formation" }
        : { agrement_statut: "a_planifier", agrement_depose_at: null, agrement_fsma_at: null, statut_reglementaire: "en_formation" };
  const { error } = await ctx.service.from("people").update(patch).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/onboarding");
  return { ok: true };
}

/** Rythme de la semaine : point individuel (mentor) et victoire partagée (le nouveau ou son mentor). */
export async function setRythme(userId: string, semaine: number, field: "point_individuel_at" | "victoire_partagee_at", done: boolean): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  const manager = await canManage(ctx, userId);
  const self = userId === ctx.me.id;
  if (field === "point_individuel_at" ? !manager : !(manager || self)) return { ok: false, error: "Non autorisé." };
  const { error } = await ctx.service.from("parcours_rythme").upsert({ user_id: userId, semaine, [field]: done ? today() : null }, { onConflict: "user_id,semaine" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/onboarding");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Administration : migration des collaborateurs déjà en place
// ---------------------------------------------------------------------------

/** Place un collaborateur à la bonne étape du nouveau parcours : date d'intégration + modules déjà obtenus. */
export async function startParcours(userId: string, integrationDate: string, modulesReussis: FsmaModule[]): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx?.me.is_admin) return { ok: false, error: "Réservé à l'administrateur." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(integrationDate)) return { ok: false, error: "Date d'intégration invalide." };
  const { error } = await ctx.service.from("people").update({ parcours_statut: "actif", integration_date: integrationDate }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  await ctx.service.from("modules_fsma").upsert(
    FSMA_MODULES.map((m) => ({
      user_id: userId,
      module: m,
      statut: modulesReussis.includes(m) ? "reussi" : "a_faire",
      reussi_at: modulesReussis.includes(m) ? integrationDate : null,
    })),
    { onConflict: "user_id,module" }
  );
  revalidatePath("/onboarding");
  return { ok: true };
}

export async function markAnterieur(userId: string): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx?.me.is_admin) return { ok: false, error: "Réservé à l'administrateur." };
  const { error } = await ctx.service.from("people").update({ parcours_statut: "anterieur_termine" }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/onboarding");
  return { ok: true };
}

/** « Jamais de nom de client devant la team » : cherche dans le texte d'une histoire des noms présents dans Clients ou Prospects. */
export async function checkStoryNames(text: string): Promise<string[]> {
  const ctx = await context();
  if (!ctx?.me.is_admin || !text.trim()) return [];
  const [{ data: clients }, { data: prospects }] = await Promise.all([
    ctx.service.from("clients").select("name").limit(5000),
    ctx.service.from("prospects").select("name").limit(5000),
  ]);
  const hay = text.toLowerCase();
  const found = new Set<string>();
  for (const r of [...(clients ?? []), ...(prospects ?? [])] as { name: string }[]) {
    const name = (r.name ?? "").trim();
    const reversed = name.includes(",") ? name.split(",").reverse().map((s) => s.trim()).join(" ") : null;
    if (name.length >= 6 && (hay.includes(name.toLowerCase()) || (reversed && hay.includes(reversed.toLowerCase())))) found.add(name);
  }
  return [...found].slice(0, 10);
}

/** Le mentor note que l'histoire de la semaine a été racontée. */
export async function markStoryTold(storyId: string, by: string): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  const { error } = await ctx.service.from("histoires").update({ racontee_le: today(), racontee_par: by }).eq("id", storyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/onboarding");
  return { ok: true };
}
