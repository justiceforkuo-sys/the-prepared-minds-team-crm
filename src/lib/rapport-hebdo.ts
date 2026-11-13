import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, evalAuto, stepState, type CohortRow, type Ctx, type Etape, type ModuleRow, type PersonParcours, type Progression } from "@/lib/parcours";
import { REACHED, RDV_FIXE } from "@/lib/calls";
import { FORMATION_MODULES } from "@/lib/formation-modules";
import type { EtapeRapport, Faits, Ligne, Niveau, Tache } from "@/lib/rapport-hebdo-format";

// Rapports du vendredi : collecte des faits, tâches de la semaine suivante, bilan des tâches de la semaine passée et niveau.
// Tout est calculé ici, par des règles fixes : Claude ne rédige que l'ouverture et la clôture (voir rapport-hebdo-ai.ts).
// Le parcours d'onboarding (parcours_etapes, parcours_progression) fait partie des faits : les étapes en retard ou en cours
// deviennent des tâches, les étapes déjà validées ou faites n'en sont jamais.

const jourBxl = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
const CLOSED = ["Perdu", "Partenaire", "Sans suite"];
const NB_MODULES_FSMA = 5;
const PHASES_ONBOARDING = ["victoires", "cap_ft2", "autonomie"];
const NB_ETAPES_MAX = 4;

export interface PersonneRapport {
  id: string;
  name: string;
  email: string | null;
  rank: string;
  integration_date: string | null;
  reports_to: string | null;
}

/** Jour du parcours (J1 = date d'intégration) et ancienneté : les cadres (JFA III et plus) sont traités comme « plus de 6 mois ». */
export function contexte(p: Pick<PersonneRapport, "rank" | "integration_date">, aujourdhui: string): { jour: number | null; plusDe6Mois: boolean } {
  const ancien = !["JFAI", "JFAII"].includes(p.rank);
  if (!p.integration_date) return { jour: null, plusDe6Mois: true };
  const jour = Math.round((Date.parse(aujourdhui) - Date.parse(p.integration_date)) / 864e5) + 1;
  return { jour, plusDe6Mois: ancien || jour >= 183 };
}

const lundiDe = (iso: string) => addDays(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));

/** Chiffres de la période [from, to] (dates de Bruxelles, bornes comprises) et situation actuelle, parcours d'onboarding compris. */
export async function collecterFaits(svc: SupabaseClient, p: PersonneRapport, from: string, to: string): Promise<Faits> {
  const earlier = `${addDays(from, -1)}T00:00:00Z`;
  const [calls, ents, daRes, act, pros, forma, fsmaRes, pol, entTotal, regRes, etapesRes, progRes] = await Promise.all([
    svc.from("call_log").select("called_at, outcome").eq("person_id", p.id).gte("called_at", earlier).limit(20000),
    svc.from("entrainement_seances").select("note, created_at").eq("person_id", p.id).gte("created_at", earlier).limit(2000),
    svc.from("daily_activity").select("date, dv_planifies, dv_realises, recomm_dv, dr_planifies, dr_realises, dossiers").eq("person_id", p.id).limit(5000),
    svc.from("activity_daily").select("seconds").eq("person_id", p.id).gte("day", from).lte("day", to),
    svc.from("prospects").select("next_follow_up, stage, list_id, classement_liste").eq("owner_id", p.id).limit(20000),
    svc.from("formation_progress").select("module_id").eq("person_id", p.id).eq("done", true),
    svc.from("modules_fsma").select("user_id, module, statut, reussi_at, note").eq("user_id", p.id),
    svc.from("clients").select("client_policies(units, created_at)").eq("owner_id", p.id),
    svc.from("entrainement_seances").select("id", { count: "exact", head: true }).eq("person_id", p.id),
    svc.from("people").select("id, vision, rank, statut_reglementaire, agrement_statut, agrement_depose_at, agrement_fsma_at, ft2_at, autonome_at, parcours_statut").eq("id", p.id).maybeSingle(),
    svc.from("parcours_etapes").select("*").eq("actif", true).order("ordre"),
    svc.from("parcours_progression").select("*").eq("user_id", p.id),
  ]);
  const inWin = (iso: string) => {
    const d = jourBxl(iso);
    return d >= from && d <= to;
  };
  const cl = ((calls.data as { called_at: string; outcome: string }[] | null) ?? []).filter((c) => inWin(c.called_at));
  const en = ((ents.data as { note: number; created_at: string }[] | null) ?? []).filter((c) => inWin(c.created_at));
  type Da = { date: string; dv_planifies: number; dv_realises: number; recomm_dv: number; dr_planifies: number; dr_realises: number; dossiers: number };
  const daAll = (daRes.data as Da[] | null) ?? [];
  const dRows = daAll.filter((r) => r.date >= from && r.date <= to);
  const sumW = (k: "dv_planifies" | "dv_realises" | "recomm_dv") => dRows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const prRows = (pros.data as { next_follow_up: string | null; stage: string; list_id: string | null; classement_liste: string | null }[] | null) ?? [];
  const own = prRows.filter((r) => !r.list_id);
  const policies = ((pol.data as { client_policies: { units: number; created_at: string }[] }[] | null) ?? []).flatMap((c) => c.client_policies);
  const units = policies.reduce((s, x) => s + Number(x.units), 0);
  const moduleRows = (fsmaRes.data as ModuleRow[] | null) ?? [];
  const reg = regRes.data as (PersonParcours & { parcours_statut: string }) | null;
  const { jour, plusDe6Mois } = contexte(p, to);
  const sansRelance = own.filter((r) => !r.next_follow_up && !CLOSED.includes(r.stage)).length;

  // Parcours d'onboarding : même évaluation que la page « Mon parcours » (règles automatiques, étapes validées ou faites)
  let onboarding: Faits["onboarding"];
  let etapesFaites: string[] | undefined;
  if (reg?.parcours_statut === "actif" && p.integration_date && jour !== null && jour >= 1) {
    const idate = p.integration_date;
    const sinceI = daAll.filter((r) => r.date >= idate);
    const sumI = (k: "dv_planifies" | "dv_realises" | "recomm_dv") => sinceI.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    const wk = lundiDe(to);
    const cohort: CohortRow = {
      person_id: p.id,
      name: p.name,
      rank: p.rank,
      mentor_id: p.reports_to,
      mentor_name: null,
      integration_date: idate,
      day_n: jour,
      units: policies.filter((x) => x.created_at.slice(0, 10) >= idate).reduce((s, x) => s + Number(x.units), 0),
      units_7d: 0,
      dv_plan_total: sumI("dv_planifies"),
      dv_real_total: sumI("dv_realises"),
      dv_plan_week: 0,
      dv_real_week: 0,
      dv_plan_j5_j7: daAll.filter((r) => r.date >= addDays(idate, 4) && r.date <= addDays(idate, 6)).reduce((s, r) => s + (Number(r.dv_planifies) || 0), 0),
      recomm_total: sumI("recomm_dv"),
      prospects_classes: prRows.filter((r) => r.classement_liste !== null).length,
      figures_days_week: daAll.filter((r) => r.date >= wk && r.date < addDays(wk, 5) && r.dv_planifies + r.dv_realises + r.recomm_dv + r.dr_planifies + r.dr_realises + r.dossiers > 0).length,
    };
    const modules: Ctx["modules"] = {};
    for (const m of moduleRows) modules[m.module] = m;
    const ctx: Ctx = { row: cohort, person: reg, modules, extras: { prospectsSansRelance: sansRelance, recoNonContactees: 0, dvSansRecos: 0, appelsDepuisJ5: 0 } };
    const prog = new Map(((progRes.data as Progression[] | null) ?? []).map((x) => [x.etape_id, x]));
    const agree = reg.statut_reglementaire === "agree_fsma";
    const etapes = ((etapesRes.data as Etape[] | null) ?? [])
      .filter((e) => PHASES_ONBOARDING.includes(e.phase))
      .sort((a, b) => PHASES_ONBOARDING.indexOf(a.phase) - PHASES_ONBOARDING.indexOf(b.phase) || a.ordre - b.ordre);
    const liste: EtapeRapport[] = [];
    etapesFaites = [];
    for (const e of etapes) {
      if (e.necessite_agrement && !agree) continue;
      const auto = evalAuto(e.auto_regle, ctx);
      const st = stepState(e, prog.get(e.id), auto, jour);
      if (st === "valide" || st === "fait") {
        etapesFaites.push(e.id);
        continue;
      }
      const dans7j = e.jour_debut !== null && e.jour_debut <= jour + 7;
      if (st === "en_retard" || st === "en_cours" || (st === "a_venir" && dans7j)) {
        liste.push({ id: e.id, titre: e.titre, jours: e.jour_debut === null ? "" : `J${e.jour_debut}${e.jour_fin && e.jour_fin !== e.jour_debut ? `-${e.jour_fin}` : ""}`, etat: st, label: auto?.label ?? null });
      }
    }
    onboarding = { jour, etapes: liste.slice(0, 8) };
  }

  return {
    appels: cl.length,
    joints: cl.filter((c) => (REACHED as string[]).includes(c.outcome)).length,
    rdv: cl.filter((c) => (RDV_FIXE as string[]).includes(c.outcome)).length,
    entrainements: en.length,
    noteMoyenne: en.length ? Math.round((en.reduce((s, e) => s + e.note, 0) / en.length) * 10) / 10 : null,
    chiffresJours: dRows.length,
    dvPlan: sumW("dv_planifies"),
    dvReal: sumW("dv_realises"),
    recos: sumW("recomm_dv"),
    minutes: Math.round(((act.data as { seconds: number }[] | null) ?? []).reduce((s, r) => s + r.seconds, 0) / 60),
    prospects: own.length,
    enListes: prRows.length - own.length,
    sansRelance,
    starterTotal: ((forma.data as unknown[] | null) ?? []).length,
    fsmaTotal: moduleRows.filter((m) => m.statut === "reussi").length,
    unites: units,
    entrainementsTotal: entTotal.count ?? 0,
    dvRealTotal: daAll.reduce((s, r) => s + (Number(r.dv_realises) || 0), 0),
    jour,
    plusDe6Mois,
    cadre: !["JFAI", "JFAII"].includes(p.rank),
    agree: reg?.statut_reglementaire === "agree_fsma" || reg?.agrement_statut === "obtenu" || reg?.agrement_statut === "depose",
    onboarding,
    etapesFaites,
  };
}

/** Tâches de la semaine suivante, d'après le niveau du collaborateur et son onboarding. La FSMA n'entre dans la liste qu'après 6 mois. */
export function genererTaches(f: Faits): Tache[] {
  const jour = f.jour ?? 999;
  const t: Tache[] = [];
  t.push({ id: "chiffres", kind: "chiffres", label: "Saisir tes chiffres du jour au moins 4 jours sur 5", cible: 4, ou: "page Aujourd'hui, « Mes chiffres du jour »" });
  // Onboarding : les étapes en retard d'abord, puis celles en cours (les étapes déjà validées ou faites n'y sont jamais)
  if (f.onboarding) {
    const ordre = { en_retard: 0, en_cours: 1, a_venir: 2, fait: 3, valide: 3 } as const;
    const aFaire = f.onboarding.etapes.filter((e) => e.etat === "en_retard" || e.etat === "en_cours").sort((a, b) => ordre[a.etat] - ordre[b.etat]);
    for (const e of aFaire.slice(0, NB_ETAPES_MAX)) {
      t.push({ id: `etape-${e.id}`, kind: "etape", etapeId: e.id, label: `Onboarding : ${e.titre}`, cible: 1, ou: "Onboarding, « Mon parcours »" });
    }
  }
  if (!f.cadre && !f.onboarding && jour < 14 && f.prospects + f.enListes < 100) {
    t.push({ id: "liste100", kind: "liste100", label: "Construire ta liste de 100 personnes", cible: 100, ou: "Prospects" });
  }
  if (f.prospects > 0 || jour >= 2) {
    t.push({ id: "relances", kind: "relances", label: "Mettre une date de relance sur chacun de tes prospects", cible: 0, ou: "Prospects" });
  }
  // 3 séances par semaine pendant le premier mois, et tant que la personne n'a pas fait 10 séances au total (les cadres : une par semaine)
  const seances = f.cadre ? 1 : jour <= 28 || (f.entrainementsTotal ?? 0) < 10 ? 3 : 1;
  t.push({ id: "entrainement", kind: "entrainement", label: `Faire ${seances} séance${seances > 1 ? "s" : ""} d'entraînement aux appels`, cible: seances, ou: "Scripts, « S'entraîner aux appels »" });
  if (jour >= 5) {
    const appels = jour < 14 ? 30 : 50;
    t.push({ id: "appels", kind: "appels", label: `Passer ${appels} appels avec le bouton « Appeler »`, cible: appels, ou: "Prospects ou Appels" });
    t.push({ id: "dv_plan", kind: "dv_plan", label: "Planifier au moins 5 DV", cible: 5, ou: "page Aujourd'hui, « Mes chiffres du jour »" });
  }
  if (f.dvRealTotal > 0) {
    t.push({ id: "recos", kind: "recos", label: "Prendre au moins 5 recommandations par DV réalisé", cible: 5, ou: "Prospects, onglet « Recommandations »" });
  }
  if (!f.cadre && f.starterTotal < FORMATION_MODULES.length) {
    t.push({ id: "starter", kind: "starter", label: "Terminer un module de plus du Starter Pack (vidéos et diapositives en entier)", cible: f.starterTotal + 1, ou: "Starter Pack" });
  }
  if (f.plusDe6Mois && !f.agree && f.fsmaTotal < NB_MODULES_FSMA) {
    t.push({ id: "fsma", kind: "fsma", label: "Valider un module FSMA de plus", cible: f.fsmaTotal + 1, ou: "Onboarding, « Mon parcours »" });
  }
  return t;
}

/** Bilan d'une liste de tâches avec les faits de la période écoulée. */
export function evaluer(taches: Tache[], f: Faits): Ligne[] {
  return taches.map((t) => {
    let realise = 0;
    let ok = false;
    let detail: string | undefined;
    switch (t.kind) {
      case "chiffres": realise = f.chiffresJours; ok = realise >= t.cible; detail = `${realise} jour${realise > 1 ? "s" : ""} saisi${realise > 1 ? "s" : ""} sur ${t.cible} demandés`; break;
      case "relances": realise = f.sansRelance; ok = realise <= t.cible; detail = ok ? "tous tes prospects ont une relance" : `${realise} prospect${realise > 1 ? "s" : ""} sans date de relance`; break;
      case "liste100": realise = f.prospects + f.enListes; ok = realise >= t.cible; detail = `${realise} personne${realise > 1 ? "s" : ""} sur ${t.cible}`; break;
      case "appels": realise = f.appels; ok = realise >= t.cible; detail = `${realise} appel${realise > 1 ? "s" : ""} sur ${t.cible} demandés`; break;
      case "entrainement": realise = f.entrainements; ok = realise >= t.cible; detail = `${realise} séance${realise > 1 ? "s" : ""} sur ${t.cible} demandées`; break;
      case "dv_plan": realise = f.dvPlan; ok = realise >= t.cible; detail = `${realise} DV planifié${realise > 1 ? "s" : ""} sur ${t.cible} demandés`; break;
      case "recos":
        realise = f.dvReal > 0 ? Math.floor(f.recos / f.dvReal) : t.cible;
        ok = realise >= t.cible;
        detail = f.dvReal > 0 ? `${f.recos} recommandation${f.recos > 1 ? "s" : ""} pour ${f.dvReal} DV` : "aucun DV réalisé cette semaine";
        break;
      case "starter": realise = f.starterTotal; ok = realise >= t.cible; detail = `${realise} module${realise > 1 ? "s" : ""} terminé${realise > 1 ? "s" : ""} sur ${t.cible} visés`; break;
      case "fsma": realise = f.fsmaTotal; ok = realise >= t.cible; detail = `${realise} module${realise > 1 ? "s" : ""} FSMA validé${realise > 1 ? "s" : ""} sur ${t.cible} visés`; break;
      case "etape":
        ok = !!t.etapeId && (f.etapesFaites ?? []).includes(t.etapeId);
        realise = ok ? 1 : 0;
        detail = ok ? "étape faite ou validée" : "étape pas encore faite";
        break;
    }
    return { id: t.id, label: t.label, cible: t.cible, realise, ok, detail };
  });
}

/** Niveau du rapport : part des tâches faites, et nombre de semaines de suite sous 50 %. */
export function niveauApres(taux: number | null, serieAvant: number): { niveau: Niveau; serie: number } {
  if (taux === null) return { niveau: 1, serie: 0 };
  const serie = taux < 0.5 ? serieAvant + 1 : 0;
  if (serie >= 3) return { niveau: 4, serie };
  if (taux >= 0.8) return { niveau: 1, serie };
  if (taux >= 0.5) return { niveau: 2, serie };
  return { niveau: 3, serie };
}
