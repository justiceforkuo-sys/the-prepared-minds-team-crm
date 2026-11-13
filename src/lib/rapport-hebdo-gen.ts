import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/parcours";
import { collecterFaits, evaluer, genererTaches, niveauApres, type PersonneRapport } from "@/lib/rapport-hebdo";
import { rediger } from "@/lib/rapport-hebdo-ai";
import { prenomDe, sujetDe, type Faits, type Ligne, type Niveau, type Redaction, type Tache } from "@/lib/rapport-hebdo-format";
import { envoyerRapportEmail } from "@/lib/email/send-rapport-hebdo";

export interface RapportRow {
  id: string;
  person_id: string;
  semaine: string;
  niveau: Niveau;
  serie: number;
  taux: number | null;
  bilan: Ligne[];
  taches: Tache[];
  faits: Faits;
  redaction: Redaction;
  sujet: string;
  statut: "a_valider" | "envoye" | "ignore";
  envoye_at: string | null;
  created_at: string;
}

export const aujourdhuiBxl = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });

/**
 * Prépare le rapport d'une personne pour le vendredi `semaine` : bilan des tâches du rapport précédent (publié), niveau,
 * tâches de la semaine suivante, rédaction. Niveaux 1 et 2 : publié tout de suite ; niveaux 3 et 4 (ou `forcerValidation`) : à valider.
 */
export async function genererPour(svc: SupabaseClient, p: PersonneRapport, semaine: string, forcerValidation = false): Promise<{ etat: "cree" | "existe"; rapport?: RapportRow; email?: string }> {
  const { data: deja } = await svc.from("rapports_hebdo").select("id").eq("person_id", p.id).eq("semaine", semaine).maybeSingle();
  if (deja) return { etat: "existe" };

  const { data: prevRows } = await svc.from("rapports_hebdo").select("*").eq("person_id", p.id).eq("statut", "envoye").lt("semaine", semaine).order("semaine", { ascending: false }).limit(1);
  const prev = ((prevRows as RapportRow[] | null) ?? [])[0] ?? null;

  const from = prev ? addDays(prev.semaine, 1) : addDays(semaine, -6);
  const faits = await collecterFaits(svc, p, from, semaine);
  if (!prev) faits.baseline = true;

  const bilan = prev ? evaluer(prev.taches, faits) : [];
  const taux = bilan.length ? bilan.filter((b) => b.ok).length / bilan.length : null;
  const { niveau, serie } = niveauApres(taux, prev?.serie ?? 0);
  const taches = genererTaches(faits);
  const redaction = await rediger({ prenom: prenomDe(p.name), niveau, baseline: !prev, serie, taux, bilan, faits, nbTaches: taches.length });

  const publie = niveau <= 2 && !forcerValidation;
  const ligne = {
    person_id: p.id,
    semaine,
    niveau,
    serie,
    taux,
    bilan,
    taches,
    faits,
    redaction,
    sujet: sujetDe(niveau, semaine, !prev),
    statut: publie ? "envoye" : "a_valider",
    envoye_at: publie ? new Date().toISOString() : null,
  };
  const { data, error } = await svc.from("rapports_hebdo").insert(ligne).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "insertion impossible");
  const rapport = data as RapportRow;
  let email: string | undefined;
  if (publie) {
    const r = await envoyerRapportEmail(svc, rapport).catch((e: unknown) => ({ sent: false, reason: e instanceof Error ? e.message : "erreur" }));
    email = r.sent ? "envoyé" : r.reason;
  }
  return { etat: "cree", rapport, email };
}

/** Prépare les rapports de toutes les personnes suivies (people.rapport_hebdo). */
export async function genererTous(svc: SupabaseClient, semaine: string, forcerValidation = false, publierDirectPour?: string): Promise<{ crees: number; existants: number; erreurs: string[]; parNiveau: Record<number, number> }> {
  const { data } = await svc.from("people").select("id, name, email, rank, integration_date, reports_to").eq("active", true).eq("rapport_hebdo", true).order("name");
  const personnes = (data as PersonneRapport[] | null) ?? [];
  const out = { crees: 0, existants: 0, erreurs: [] as string[], parNiveau: {} as Record<number, number> };
  for (let i = 0; i < personnes.length; i += 4) {
    const lot = personnes.slice(i, i + 4);
    const res = await Promise.all(lot.map((p) => genererPour(svc, p, semaine, forcerValidation && p.id !== publierDirectPour).then((r) => ({ p, r }), (e: unknown) => ({ p, e }))));
    for (const x of res) {
      if ("e" in x) out.erreurs.push(`${x.p.name} : ${x.e instanceof Error ? x.e.message : "erreur"}`);
      else if (x.r.etat === "existe") out.existants++;
      else {
        out.crees++;
        const n = x.r.rapport!.niveau;
        out.parNiveau[n] = (out.parNiveau[n] ?? 0) + 1;
      }
    }
  }
  return out;
}
