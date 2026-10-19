// Parcours du nouveau collaborateur : types, règles de validation automatique, projection, alertes.
// Logique pure (aucun accès base) : partagée par la page Onboarding et la page Aujourd'hui.

import type { Person } from "@/types/database";

/** Champs du parcours ajoutés à la fiche collaborateur (migration 039). */
export type ParcoursFields = {
  parcours_statut: "non_demarre" | "actif" | "anterieur_termine";
  integration_date: string | null;
  statut_reglementaire: "en_formation" | "agree_fsma";
  ft2_at: string | null;
};
export const parcoursOf = (p: Person) => p as Person & Partial<ParcoursFields>;

/** Un nouveau qui n'a pas encore atteint FT2 / JFA II : le Pipeline et le Défi LinkedIn ne font pas partie de son parcours. */
export function isPreFt2Newcomer(p: Person): boolean {
  const f = parcoursOf(p);
  return f.parcours_statut === "actif" && !f.ft2_at;
}

export const TARGET_UNITS = 1000;
export const MAX_DAY = 60;
export const ORANGE_DAY = 45;

export const FSMA_MODULES = ["1.1", "1.2", "3.1", "3.2", "4"] as const;
export type FsmaModule = (typeof FSMA_MODULES)[number];
export type ModuleStatut = "a_faire" | "en_cours" | "reussi";
export const MODULE_LABEL: Record<ModuleStatut, string> = { a_faire: "À faire", en_cours: "En cours", reussi: "Réussi" };
// Jour limite pour avoir réussi chaque module (sert aux alertes « module en retard »)
export const MODULE_DEADLINE: Record<FsmaModule, number> = { "1.1": 9, "1.2": 9, "3.1": 28, "3.2": 28, "4": 42 };

export type AgrementStatut = "a_planifier" | "depose" | "obtenu";
export const AGREMENT_LABEL: Record<AgrementStatut, string> = { a_planifier: "À planifier", depose: "Déposé", obtenu: "Obtenu" };

export type Phase = "victoires" | "cap_ft2" | "autonomie" | "rythme" | "validation" | "regle";
export const PHASE_LABEL: Record<Phase, string> = {
  victoires: "Phase 1 — Jours 1 à 14 : les victoires rapides",
  cap_ft2: "Phase 2 — Semaines 3 à 8 : cap FT2 / JFA II",
  autonomie: "Phase 3 — Après l'agrément : liberté et autonomie (semaines 9 à 12)",
  rythme: "Rythme fixe chaque semaine",
  validation: "Validation finale (8 points, cochés par le mentor)",
  regle: "Règle continue : les recommandations",
};

export interface Etape {
  id: string;
  phase: Phase;
  ordre: number;
  jour_debut: number | null;
  jour_fin: number | null;
  titre: string;
  avec_qui: string | null;
  victoire: string | null;
  etage_technique: string | null;
  etage_savoir_etre: string | null;
  auto_regle: string | null;
  necessite_agrement: boolean;
  actif: boolean;
}

export interface CohortRow {
  person_id: string;
  name: string;
  rank: string;
  mentor_id: string | null;
  mentor_name: string | null;
  integration_date: string;
  day_n: number;
  units: number | string;
  units_7d: number | string;
  dv_plan_total: number | string;
  dv_real_total: number | string;
  dv_plan_week: number | string;
  dv_real_week: number | string;
  dv_plan_j5_j7: number | string;
  recomm_total: number | string;
  prospects_classes: number | string;
  figures_days_week: number | string;
}

export interface PersonParcours {
  id: string;
  vision: string | null;
  rank: string;
  statut_reglementaire: "en_formation" | "agree_fsma";
  agrement_statut: AgrementStatut;
  agrement_depose_at: string | null;
  agrement_fsma_at: string | null;
  ft2_at: string | null;
  autonome_at: string | null;
}

export interface Progression {
  user_id: string;
  etape_id: string;
  fait_at: string | null;
  valide_at: string | null;
  valide_par: string | null;
  preuve: string | null;
}

export interface ModuleRow {
  user_id: string;
  module: FsmaModule;
  statut: ModuleStatut;
  reussi_at: string | null;
  note: string | null;
}

export interface RythmeRow {
  user_id: string;
  semaine: number;
  point_individuel_at: string | null;
  victoire_partagee_at: string | null;
}

/** Données complémentaires par personne (comptées côté serveur). */
export interface Extras {
  prospectsSansRelance: number;
  recoNonContactees: number; // recommandations à contacter depuis plus de 48 h
  dvSansRecos: number; // DV réalisés (aujourd'hui / hier) avec moins de 5 recommandations encodées
}

export interface Ctx {
  row: CohortRow;
  person: PersonParcours;
  modules: Partial<Record<FsmaModule, ModuleRow>>;
  extras: Extras;
}

const n = (v: number | string) => Number(v) || 0;

export function moduleStatut(ctx: Ctx, m: FsmaModule): ModuleStatut {
  return ctx.modules[m]?.statut ?? "a_faire";
}

export function modulesReussis(ctx: Ctx): number {
  return FSMA_MODULES.filter((m) => moduleStatut(ctx, m) === "reussi").length;
}

export function recosPerDv(row: CohortRow): number | null {
  const dv = n(row.dv_real_total);
  return dv > 0 ? n(row.recomm_total) / dv : null;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function addDays(iso: string, k: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10);
}

export function weekOf(day: number): number {
  return Math.max(1, Math.ceil(day / 7));
}

// ---------------------------------------------------------------------------
// Projection vers 1 000 unités
// ---------------------------------------------------------------------------

export interface Projection {
  /** jour du parcours auquel les 1 000 unités seront atteintes au rythme actuel (null : pas encore de rythme) */
  day: number | null;
  date: string | null;
  tone: "ok" | "warn" | "late" | "none" | "done";
}

export function projectUnits(units: number, day: number, integrationDate: string): Projection {
  if (units >= TARGET_UNITS) return { day: null, date: null, tone: "done" };
  if (units <= 0) return { day: null, date: null, tone: day > MAX_DAY ? "late" : "none" };
  const rate = units / Math.max(1, day);
  const projDay = Math.ceil(TARGET_UNITS / rate);
  return {
    day: projDay,
    date: addDays(integrationDate, projDay - 1),
    tone: projDay > MAX_DAY ? "late" : projDay > ORANGE_DAY ? "warn" : "ok",
  };
}

// ---------------------------------------------------------------------------
// Règles automatiques (étapes.auto_regle)
// ---------------------------------------------------------------------------

export interface AutoResult {
  done: boolean;
  label: string;
}

export function evalAuto(code: string | null, ctx: Ctx): AutoResult | null {
  if (!code) return null;
  const { row, person } = ctx;
  const units = n(row.units);
  switch (code) {
    case "pourquoi": {
      const len = (person.vision ?? "").trim().length;
      return { done: len >= 20, label: len >= 20 ? "Pourquoi écrit" : "Écris ton pourquoi dans « Ma vision »" };
    }
    case "prospects_100": {
      const c = n(row.prospects_classes);
      return { done: c >= 100, label: `${c} / 100 personnes classées` };
    }
    case "dv_plan_5": {
      const c = n(row.dv_plan_j5_j7);
      return { done: c >= 5, label: `${c} DV planifiés entre J5 et J7 (objectif 10, validé dès 5)` };
    }
    case "modules_11_12": {
      const ok = moduleStatut(ctx, "1.1") === "reussi" && moduleStatut(ctx, "1.2") === "reussi";
      return { done: ok, label: `Modules 1.1 : ${MODULE_LABEL[moduleStatut(ctx, "1.1")]} · 1.2 : ${MODULE_LABEL[moduleStatut(ctx, "1.2")]}` };
    }
    case "dv_duo": {
      const c = n(row.dv_real_total);
      return { done: c >= 1, label: `${c} DV réalisé${c > 1 ? "s" : ""}` };
    }
    case "dv_3_units": {
      const c = n(row.dv_real_total);
      return { done: c >= 3 && units > 0, label: `${c} DV réalisés (objectif 5) · ${Math.round(units)} unités` };
    }
    case "units_500":
      return { done: units >= 500, label: `${Math.round(units)} / 500 unités` };
    case "units_1000":
      return { done: units >= TARGET_UNITS, label: `${Math.round(units)} / 1 000 unités` };
    case "modules_5_depot": {
      const mods = modulesReussis(ctx);
      const depot = person.agrement_statut === "depose" || person.agrement_statut === "obtenu";
      return { done: mods === 5 && depot, label: `Modules ${mods} / 5 · dossier d'agrément ${depot ? "déposé" : "à déposer"}` };
    }
    case "ft2": {
      const ok = person.ft2_at !== null || units >= TARGET_UNITS;
      return { done: ok, label: ok ? "FT2 / JFA II atteint" : `${Math.round(units)} / 1 000 unités` };
    }
    case "agrement": {
      const ok = person.statut_reglementaire === "agree_fsma";
      return { done: ok, label: ok ? `Agréé FSMA${person.agrement_fsma_at ? ` le ${person.agrement_fsma_at}` : ""}` : "En formation" };
    }
    case "recos_5": {
      const r = recosPerDv(row);
      if (r === null) return { done: false, label: "Pas encore de DV réalisé" };
      return { done: r >= 5, label: `${r.toFixed(1)} recommandations par DV en moyenne` };
    }
    case "suivi_ok": {
      const ok = ctx.extras.prospectsSansRelance === 0 && n(row.figures_days_week) > 0;
      return { done: ok, label: `${ctx.extras.prospectsSansRelance} ligne(s) sans date de relance · ${n(row.figures_days_week)} jour(s) de chiffres cette semaine` };
    }
    case "chiffres_vendredi":
      return { done: n(row.figures_days_week) > 0, label: n(row.figures_days_week) > 0 ? "Chiffres saisis cette semaine" : "Aucun chiffre saisi cette semaine" };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// État d'une étape
// ---------------------------------------------------------------------------

export type StepState = "valide" | "fait" | "en_retard" | "en_cours" | "a_venir";

export function stepState(etape: Etape, prog: Progression | undefined, auto: AutoResult | null, day: number): StepState {
  if (prog?.valide_at) return "valide";
  if (prog?.fait_at || auto?.done) return "fait";
  if (etape.jour_fin !== null && day > etape.jour_fin + 2) return "en_retard";
  if (etape.jour_debut !== null && day >= etape.jour_debut) return "en_cours";
  if (etape.jour_debut === null) return "en_cours";
  return "a_venir";
}

export const STATE_LABEL: Record<StepState, string> = {
  valide: "Validé",
  fait: "Fait",
  en_retard: "En retard",
  en_cours: "En cours",
  a_venir: "À venir",
};

// ---------------------------------------------------------------------------
// Alertes de décrochage (page Aujourd'hui du mentor)
// ---------------------------------------------------------------------------

export interface Alert {
  personId: string;
  personName: string;
  severity: "rouge" | "orange";
  text: string;
}

export interface AlertInput extends Ctx {
  etapes: Etape[];
  progression: Progression[];
  rythme: RythmeRow[];
  /** jour de la semaine Bruxelles (1 = lundi … 7 = dimanche) et heure */
  weekday: number;
  hour: number;
}

export function computeAlerts(input: AlertInput): Alert[] {
  const { row, person, etapes, progression, rythme, weekday, hour } = input;
  const out: Alert[] = [];
  const label = row.name.includes(",") ? row.name.split(",")[1].trim() : row.name.split(" ")[0];
  const day = row.day_n;
  const units = n(row.units);
  const push = (severity: Alert["severity"], text: string) => out.push({ personId: row.person_id, personName: row.name, severity, text });

  const proj = projectUnits(units, day, row.integration_date);
  if (units < TARGET_UNITS && !person.ft2_at) {
    if (day > MAX_DAY) {
      push("rouge", `${label} : J${day}, ${Math.round(units)} / 1 000 unités, au-delà de J60. Plan de relance : point de 30 min obligatoire, objectif de DV de la semaine à fixer ensemble.`);
    } else if (proj.tone === "late" || (units === 0 && day >= 14)) {
      push("rouge", `${label} : J${day}, ${Math.round(units)} / 1 000 unités${n(row.dv_plan_week) === 0 ? `, ${n(row.dv_plan_week)} DV planifié cette semaine` : ""}. Un appel aujourd'hui ?`);
    } else if (proj.tone === "warn") {
      push("orange", `${label} : J${day}, ${Math.round(units)} / 1 000 unités, rythme insuffisant (objectif atteint vers J${proj.day}).`);
    }
  }

  if (day >= 5 && weekday >= 3 && weekday <= 5 && n(row.dv_plan_week) === 0) {
    push("orange", `${label} : J${day}, aucun DV planifié cette semaine.`);
  }

  for (const m of FSMA_MODULES) {
    if (day > MODULE_DEADLINE[m] && moduleStatut(input, m) !== "reussi") {
      push("orange", `${label} : module ${m} en retard (attendu avant J${MODULE_DEADLINE[m]}).`);
      break;
    }
  }

  const late = etapes
    .filter((e) => (e.phase === "victoires" || e.phase === "cap_ft2") && e.actif && e.jour_fin !== null && day > e.jour_fin + 2)
    .filter((e) => {
      const p = progression.find((x) => x.etape_id === e.id);
      const auto = evalAuto(e.auto_regle, input);
      return !(p?.fait_at || p?.valide_at || auto?.done);
    });
  if (late.length > 0) push("orange", `${label} : étape en retard de plus de 2 jours : « ${late[0].titre} ».`);

  const missed = [...Array(Math.max(0, weekOf(day) - 1)).keys()]
    .map((i) => i + 1)
    .filter((w) => !rythme.find((r) => r.semaine === w)?.point_individuel_at);
  if (missed.length > 0) push("orange", `${label} : point individuel non tenu (semaine ${missed[missed.length - 1]}).`);

  if (n(row.figures_days_week) === 0 && (weekday > 5 || (weekday === 5 && hour >= 20))) {
    push("orange", `${label} : aucun chiffre saisi cette semaine (chiffres du vendredi absents).`);
  }

  if (input.extras.dvSansRecos > 0) {
    push("orange", `${label} : DV réalisé depuis moins de 24 h avec moins de 5 recommandations encodées.`);
  }
  if (input.extras.recoNonContactees > 0) {
    push("rouge", `${label} : ${input.extras.recoNonContactees} recommandation(s) non contactée(s) depuis plus de 48 h.`);
  }
  return out;
}
