"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { analyserIdee } from "@/lib/idees-ai";
import { isSaneFollowUpDate } from "@/lib/follow-ups";
import { FLECHES, type Fleche, type IdeeSource, type IdeeStatut } from "@/lib/idees";

export type IdeeResult = { ok: true; processed?: boolean; message?: string } | { ok: false; error: string };

const MAX_TEXT = 4000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function context() {
  const me = await getCurrentPerson();
  if (!me) return null;
  return { me, supabase: (await createClient()) as unknown as SupabaseClient, service: createServiceClient() as unknown as SupabaseClient };
}

/** Tiroirs de la personne : sa propre liste si elle en a une, sinon la liste par défaut. */
async function tiroirNames(supabase: SupabaseClient, personId: string): Promise<string[]> {
  const { data } = await supabase.from("tiroirs").select("owner_id, numero, nom").or(`owner_id.eq.${personId},owner_id.is.null`).order("numero");
  const rows = (data as { owner_id: string | null; numero: number; nom: string }[] | null) ?? [];
  const own = rows.filter((r) => r.owner_id === personId);
  return (own.length > 0 ? own : rows.filter((r) => r.owner_id === null)).map((r) => r.nom);
}

async function process(ctx: NonNullable<Awaited<ReturnType<typeof context>>>, id: string, texte: string): Promise<boolean> {
  try {
    const today = toISO(brusselsNow());
    const tiroirs = await tiroirNames(ctx.supabase, ctx.me.id);
    const a = await analyserIdee(texte, tiroirs, today);
    await ctx.supabase
      .from("idees")
      .update({
        reformulation: a.reformulation || null,
        tiroir: a.tiroir,
        fleche: a.fleche,
        questions: a.questions,
        faisabilite: a.faisabilite || null,
        prochaine_action: a.prochaine_action || null,
        action_date: a.action_date,
        traitement_ia: "fait",
        traitement_erreur: null,
        maj_le: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", ctx.me.id);
    return true;
  } catch (e) {
    await ctx.supabase
      .from("idees")
      .update({ traitement_ia: "erreur", traitement_erreur: e instanceof Error ? e.message.slice(0, 300) : "erreur inconnue" })
      .eq("id", id)
      .eq("user_id", ctx.me.id);
    return false;
  }
}

/**
 * Enregistre l'idée brute d'abord (rien ne doit se perdre), puis la fait traiter par Claude.
 * L'identifiant vient du navigateur : un renvoi après coupure réseau ne crée jamais de doublon.
 */
export async function saveIdea(input: { id: string; texte: string; source: IdeeSource; cree_le?: string }): Promise<IdeeResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée : reconnecte-toi, ton idée reste sur ton téléphone." };
  const texte = input.texte.trim().slice(0, MAX_TEXT);
  if (!texte) return { ok: false, error: "Idée vide." };
  if (!UUID.test(input.id)) return { ok: false, error: "Identifiant invalide." };
  const source: IdeeSource = input.source === "voix" ? "voix" : "texte";
  const created = input.cree_le && !Number.isNaN(Date.parse(input.cree_le)) ? new Date(input.cree_le).toISOString() : new Date().toISOString();

  const { error } = await ctx.supabase
    .from("idees")
    .upsert({ id: input.id, user_id: ctx.me.id, texte_brut: texte, source, cree_le: created }, { onConflict: "id", ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };

  const processed = await process(ctx, input.id, texte);
  revalidatePath("/idees");
  revalidatePath("/");
  return { ok: true, processed };
}

export async function retraiterIdee(id: string): Promise<IdeeResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  const { data } = await ctx.supabase.from("idees").select("texte_brut").eq("id", id).eq("user_id", ctx.me.id).maybeSingle();
  if (!data) return { ok: false, error: "Idée introuvable." };
  const processed = await process(ctx, id, (data as { texte_brut: string }).texte_brut);
  revalidatePath("/idees");
  return processed ? { ok: true, processed } : { ok: false, error: "Le traitement automatique a échoué : réessaie plus tard ou range l'idée à la main." };
}

export interface IdeePatch {
  reformulation?: string | null;
  tiroir?: string | null;
  fleche?: Fleche | null;
  prochaine_action?: string | null;
  action_date?: string | null;
  statut?: IdeeStatut;
}

export async function updateIdee(id: string, patch: IdeePatch): Promise<IdeeResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  const clean: Record<string, unknown> = { maj_le: new Date().toISOString() };
  if ("reformulation" in patch) clean.reformulation = patch.reformulation?.trim().slice(0, 1000) || null;
  if ("tiroir" in patch) clean.tiroir = patch.tiroir?.trim().slice(0, 120) || null;
  if ("fleche" in patch) {
    if (patch.fleche && !FLECHES.includes(patch.fleche)) return { ok: false, error: "Flèche invalide." };
    clean.fleche = patch.fleche ?? null;
  }
  if ("prochaine_action" in patch) clean.prochaine_action = patch.prochaine_action?.trim().slice(0, 500) || null;
  if ("action_date" in patch) {
    if (patch.action_date && !isSaneFollowUpDate(patch.action_date)) return { ok: false, error: "Date invalide : vérifie l'année (4 chiffres)." };
    clean.action_date = patch.action_date || null;
  }
  if (patch.statut) {
    if (!["a_traiter", "en_action", "classee"].includes(patch.statut)) return { ok: false, error: "Statut invalide." };
    clean.statut = patch.statut;
  }
  const { error } = await ctx.supabase.from("idees").update(clean).eq("id", id).eq("user_id", ctx.me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/idees");
  revalidatePath("/");
  return { ok: true };
}

/** Transforme l'idée en tâche (agenda), en prospect ou en candidature, puis la passe « en action ». */
export async function convertirIdee(id: string, kind: "tache" | "prospect" | "candidature", name?: string): Promise<IdeeResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  const { data } = await ctx.supabase.from("idees").select("*").eq("id", id).eq("user_id", ctx.me.id).maybeSingle();
  if (!data) return { ok: false, error: "Idée introuvable." };
  const i = data as { texte_brut: string; reformulation: string | null; prochaine_action: string | null; action_date: string | null };
  const notes = [i.reformulation, i.reformulation ? `Idée brute : ${i.texte_brut}` : i.texte_brut].filter(Boolean).join("\n\n").slice(0, 1500);

  if (kind === "tache") {
    const title = (i.prochaine_action || i.reformulation || i.texte_brut).slice(0, 140);
    const { error } = await ctx.supabase.from("tasks").insert({ assigned_by: ctx.me.id, assigned_to: ctx.me.id, title, notes, due_date: i.action_date });
    if (error) return { ok: false, error: error.message };
  } else {
    const who = name?.trim();
    if (!who) return { ok: false, error: kind === "prospect" ? "Indique le nom du prospect." : "Indique le nom du candidat." };
    if (kind === "prospect") {
      const { error } = await ctx.supabase.from("prospects").insert({ owner_id: ctx.me.id, name: who.slice(0, 120), notes, source: "Idée", next_follow_up: i.action_date && isSaneFollowUpDate(i.action_date) ? i.action_date : null });
      if (error) return { ok: false, error: error.message };
    } else {
      const today = toISO(brusselsNow());
      const { error } = await ctx.supabase.from("recruitment_applications").insert({
        recruiter_id: ctx.me.id,
        owner_id: ctx.me.id,
        name: who.slice(0, 120),
        referral_source: "Idée",
        status: "Nouveau",
        next_action: "Premier contact",
        next_action_date: today,
        motivation: notes,
      });
      if (error) return { ok: false, error: error.message };
    }
  }
  await ctx.supabase.from("idees").update({ statut: "en_action", convertie_en: kind, maj_le: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.me.id);
  revalidatePath("/idees");
  revalidatePath("/");
  return { ok: true, message: kind === "tache" ? "Tâche ajoutée à ton agenda." : kind === "prospect" ? "Prospect créé." : "Candidature créée dans Recrutement." };
}

/** Partage une idée (privée par défaut) avec Justice ou avec son parrain ; null = ne plus partager. */
export async function partagerIdee(id: string, cible: "justice" | "parrain" | null): Promise<IdeeResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  let target: string | null = null;
  if (cible === "justice") {
    const { data } = await ctx.service.from("people").select("id").eq("slug", "justice").maybeSingle();
    target = (data as { id: string } | null)?.id ?? null;
    if (!target) return { ok: false, error: "Justice est introuvable dans l'annuaire." };
  } else if (cible === "parrain") {
    target = ctx.me.reports_to ?? null;
    if (!target) return { ok: false, error: "Tu n'as pas de parrain enregistré." };
  }
  if (target === ctx.me.id) return { ok: false, error: "Tu ne peux pas partager une idée avec toi-même." };
  const { error } = await ctx.supabase.from("idees").update({ partagee_avec: target, maj_le: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/idees");
  return { ok: true };
}

export async function supprimerIdee(id: string): Promise<IdeeResult> {
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Session expirée." };
  const { error } = await ctx.supabase.from("idees").delete().eq("id", id).eq("user_id", ctx.me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/idees");
  revalidatePath("/");
  return { ok: true };
}
