"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { fsmaFlags } from "@/lib/linkedin/templates";
import { evaluerAppel, repliqueProspect } from "@/lib/entrainement-ai";
import { MAX_CARACTERES, MAX_ECHANGES, PRENOMS, PROFILS, SCENARIOS, type Echange, type Retour } from "@/lib/entrainement";

export type ReplyResult = { ok: true; texte: string; fin: boolean } | { ok: false; error: string };
export type RetourResult = { ok: true; retour: Retour; enregistre: boolean } | { ok: false; error: string };

export interface SeanceLigne {
  id: string;
  person_id: string;
  scenario_titre: string;
  niveau: string | null;
  profil_label: string | null;
  note: number;
  rdv_obtenu: boolean;
  created_at: string;
}
export interface SeanceDetail extends SeanceLigne {
  prenom: string | null;
  echanges: Echange[];
  retour: Retour;
}
export type SeanceResult = { ok: true; seance: SeanceDetail } | { ok: false; error: string };

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

/** Retour de l'appel : critères de la méthode de l'équipe, note sur 10, un point à améliorer. La séance est enregistrée (visible par la hiérarchie). */
export async function evaluerSeance(scenarioId: string, profilId: string, prenom: string, echanges: Echange[]): Promise<RetourResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  const sc = SCENARIOS.find((s) => s.id === scenarioId);
  const pr = PROFILS.find((p) => p.id === profilId);
  if (!sc || !pr || !PRENOMS.includes(prenom)) return { ok: false, error: "Données invalides." };
  const err = controler(echanges);
  if (err) return { ok: false, error: err };
  if (echanges.filter((e) => e.role === "collab").length < 2) return { ok: false, error: "Parle un peu plus avant de demander le retour." };

  // Mots à risque dans ce que dit le collaborateur (pas de promesse de rendement ni de « garanti »)
  const motsARisque = [...new Set(echanges.filter((e) => e.role === "collab").flatMap((e) => fsmaFlags(e.text)))];

  const svc = createServiceClient() as unknown as SupabaseClient;
  const { data } = await svc.from("objections").select("reponse_equipe").eq("validee", true).not("reponse_equipe", "is", null).limit(20);
  const reponses = ((data as { reponse_equipe: string }[] | null) ?? []).map((r) => r.reponse_equipe);

  let retour: Retour;
  try {
    retour = await evaluerAppel(sc, echanges, reponses, motsARisque);
  } catch {
    return { ok: false, error: "Le retour n'a pas pu être préparé : réessaie." };
  }

  // Conservation de la séance : si l'enregistrement échoue, le collaborateur reçoit quand même son retour.
  const note = Math.max(0, Math.min(10, Math.round(Number(retour.note) || 0)));
  const { error } = await svc.from("entrainement_seances").insert({
    person_id: me.id,
    scenario_id: sc.id,
    scenario_titre: sc.titre,
    niveau: sc.niveau,
    profil_label: pr.label,
    prenom,
    note,
    rdv_obtenu: !!retour.rdvObtenu,
    echanges,
    retour,
  });
  return { ok: true, retour, enregistre: !error };
}

/** Ids des personnes qu'une personne peut suivre : sa cascade (tous niveaux), sans elle-même. */
async function equipeDe(svc: SupabaseClient, meId: string): Promise<Set<string>> {
  const { data } = await svc.from("people").select("id, reports_to");
  const kids = new Map<string, string[]>();
  for (const p of (data as { id: string; reports_to: string | null }[] | null) ?? []) if (p.reports_to) kids.set(p.reports_to, [...(kids.get(p.reports_to) ?? []), p.id]);
  const scope = new Set<string>();
  const stack = [meId];
  while (stack.length) {
    for (const k of kids.get(stack.pop()!) ?? []) {
      if (scope.has(k)) continue;
      scope.add(k);
      stack.push(k);
    }
  }
  return scope;
}

/** Ouvre une séance entière (conversation et retour) : la personne elle-même, sa hiérarchie ou un administrateur. */
export async function ouvrirSeance(id: string): Promise<SeanceResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { ok: false, error: "Séance invalide." };
  const svc = createServiceClient() as unknown as SupabaseClient;
  const { data } = await svc
    .from("entrainement_seances")
    .select("id, person_id, scenario_titre, niveau, profil_label, prenom, note, rdv_obtenu, created_at, echanges, retour")
    .eq("id", id)
    .maybeSingle();
  const s = data as SeanceDetail | null;
  if (!s) return { ok: false, error: "Séance introuvable." };
  if (s.person_id !== me.id && !me.is_admin && !(await equipeDe(svc, me.id)).has(s.person_id)) return { ok: false, error: "Tu n'as pas accès à cette séance." };
  return { ok: true, seance: s };
}
