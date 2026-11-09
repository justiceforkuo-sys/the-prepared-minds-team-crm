"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { fsmaFlags } from "@/lib/linkedin/templates";
import { evaluerAppel, repliqueProspect } from "@/lib/entrainement-ai";
import { MAX_CARACTERES, MAX_ECHANGES, PRENOMS, PROFILS, SCENARIOS, type Echange, type Retour } from "@/lib/entrainement";

export type ReplyResult = { ok: true; texte: string; fin: boolean } | { ok: false; error: string };
export type RetourResult = { ok: true; retour: Retour } | { ok: false; error: string };

function controler(echanges: Echange[]): string | null {
  if (!Array.isArray(echanges) || echanges.length === 0 || echanges.length > MAX_ECHANGES * 2) return "Appel trop long : recommence une séance.";
  for (const [i, e] of echanges.entries()) {
    if ((e.role !== "collab" && e.role !== "prospect") || typeof e.text !== "string") return "Données invalides.";
    if (e.role !== (i % 2 === 0 ? "prospect" : "collab")) return "Données invalides.";
    if (e.text.length === 0 || e.text.length > MAX_CARACTERES) return `Chaque réplique fait ${MAX_CARACTERES} caractères au maximum.`;
  }
  return null;
}

/** Réplique du prospect fictif. Rien n'est enregistré. */
export async function repondreProspect(scenarioId: string, profilId: string, prenom: string, echanges: Echange[]): Promise<ReplyResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  const sc = SCENARIOS.find((s) => s.id === scenarioId);
  const pr = PROFILS.find((p) => p.id === profilId);
  if (!sc || !pr || !PRENOMS.includes(prenom)) return { ok: false, error: "Données invalides." };
  const err = controler(echanges);
  if (err) return { ok: false, error: err };
  if (echanges[echanges.length - 1].role !== "collab") return { ok: false, error: "Données invalides." };
  try {
    const r = await repliqueProspect(sc, pr, prenom, echanges);
    return { ok: true, texte: r.texte, fin: r.fin };
  } catch {
    return { ok: false, error: "Le prospect ne répond pas : réessaie dans un instant." };
  }
}

/** Retour de l'appel : critères de la méthode de l'équipe, note sur 10, un point à améliorer. Rien n'est enregistré. */
export async function evaluerSeance(scenarioId: string, echanges: Echange[]): Promise<RetourResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  const sc = SCENARIOS.find((s) => s.id === scenarioId);
  if (!sc) return { ok: false, error: "Données invalides." };
  const err = controler(echanges);
  if (err) return { ok: false, error: err };
  if (echanges.filter((e) => e.role === "collab").length < 2) return { ok: false, error: "Parle un peu plus avant de demander le retour." };

  // Mots à risque dans ce que dit le collaborateur (pas de promesse de rendement ni de « garanti »)
  const motsARisque = [...new Set(echanges.filter((e) => e.role === "collab").flatMap((e) => fsmaFlags(e.text)))];

  const svc = createServiceClient() as unknown as SupabaseClient;
  const { data } = await svc.from("objections").select("reponse_equipe").eq("validee", true).not("reponse_equipe", "is", null).limit(20);
  const reponses = ((data as { reponse_equipe: string }[] | null) ?? []).map((r) => r.reponse_equipe);

  try {
    return { ok: true, retour: await evaluerAppel(sc, echanges, reponses, motsARisque) };
  } catch {
    return { ok: false, error: "Le retour n'a pas pu être préparé : réessaie." };
  }
}
