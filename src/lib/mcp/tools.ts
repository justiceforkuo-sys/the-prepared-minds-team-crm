import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { loadRemuSummary } from "@/lib/remuneration-data";
import { PAID_STAGES, PENDING_STAGES, pctLabel, pvq1 } from "@/lib/pvq";
import type { DealStage } from "@/types/database";

// Outils du connecteur Claude : LECTURE SEULE. Aucun outil n'écrit, ne supprime ni n'envoie quoi que ce soit.
// Les coordonnées des clients (téléphone, email, adresse) ne sont jamais renvoyées.

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const svc = () => createServiceClient() as unknown as SupabaseClient;
const currentMonth = () => toISO(brusselsNow()).slice(0, 7);
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>, ctx: { personId: string }) => Promise<unknown>;
}

const monthArg = { type: "string", description: "Mois de production au format AAAA-MM (par défaut : le mois en cours)." };

function readMonth(args: Record<string, unknown>): string {
  const m = typeof args.mois === "string" && args.mois ? args.mois : currentMonth();
  if (!MONTH.test(m)) throw new Error("Le mois doit être au format AAAA-MM.");
  return m;
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

type PolicyRow = {
  id: string;
  product_label: string | null;
  partner: string | null;
  units: number | null;
  deal_stage: DealStage;
  production_month: string | null;
  signed_on: string | null;
  client: { name: string; owner_id: string } | { name: string; owner_id: string }[] | null;
};

async function policiesOfMonth(month: string): Promise<(PolicyRow & { owner_id: string; client_name: string })[]> {
  const rows = await fetchAll<PolicyRow>((from, to) =>
    svc()
      .from("client_policies")
      .select("id, product_label, partner, units, deal_stage, production_month, signed_on, client:clients!inner(name, owner_id)")
      .eq("production_month", month)
      .order("id")
      .range(from, to)
  );
  return rows.flatMap((r) => {
    const c = Array.isArray(r.client) ? r.client[0] : r.client;
    return c ? [{ ...r, owner_id: c.owner_id, client_name: c.name }] : [];
  });
}

async function peopleNames(): Promise<Record<string, string>> {
  const { data } = await svc().from("people").select("id, name");
  return Object.fromEntries(((data as { id: string; name: string }[] | null) ?? []).map((p) => [p.id, p.name]));
}

export const TOOLS: ToolDef[] = [
  {
    name: "vue_ensemble",
    title: "Vue d'ensemble de l'équipe",
    description: "Liste des collaborateurs (rang, statut, parcours) et production des 4 derniers mois (contrats et unités).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const { data: people } = await svc()
        .from("people")
        .select("name, rank, active, status, parcours_statut, date_demarrage, agrement_fsma_at, contract_type, is_admin")
        .order("name");
      const now = brusselsNow();
      const months = Array.from({ length: 4 }, (_, i) => toISO(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
      const pol = await fetchAll<{ production_month: string | null; units: number | null }>((from, to) =>
        svc().from("client_policies").select("production_month, units").in("production_month", months).order("id").range(from, to)
      );
      const prod: Record<string, { contrats: number; unites: number }> = Object.fromEntries(months.map((m) => [m, { contrats: 0, unites: 0 }]));
      for (const p of pol) if (p.production_month && prod[p.production_month]) {
        prod[p.production_month].contrats += 1;
        prod[p.production_month].unites += Number(p.units) || 0;
      }
      for (const m of months) prod[m].unites = round(prod[m].unites, 1);
      return { aujourd_hui: toISO(now), equipe: people ?? [], production_par_mois: prod };
    },
  },
  {
    name: "production_par_collaborateur",
    title: "Production par collaborateur",
    description: "Contrats et unités d'un mois de production, par collaborateur, avec la répartition par étape (Contrat signé, Décompté, Non paiement…).",
    inputSchema: { type: "object", properties: { mois: monthArg }, additionalProperties: false },
    async run(args) {
      const month = readMonth(args);
      const [rows, names] = await Promise.all([policiesOfMonth(month), peopleNames()]);
      const by = new Map<string, { contrats: number; unites: number; etapes: Record<string, number> }>();
      for (const r of rows) {
        const e = by.get(r.owner_id) ?? { contrats: 0, unites: 0, etapes: {} };
        e.contrats += 1;
        e.unites += Number(r.units) || 0;
        e.etapes[r.deal_stage] = (e.etapes[r.deal_stage] ?? 0) + 1;
        by.set(r.owner_id, e);
      }
      const liste = [...by.entries()].map(([id, e]) => ({ collaborateur: names[id] ?? "?", contrats: e.contrats, unites: round(e.unites, 1), etapes: e.etapes })).sort((a, b) => b.unites - a.unites);
      return { mois: month, total_contrats: rows.length, total_unites: round(rows.reduce((a, r) => a + (Number(r.units) || 0), 0), 1), collaborateurs: liste };
    },
  },
  {
    name: "decomptes_pvq1",
    title: "Décomptes et PVQ1",
    description:
      "PVQ1 d'un mois : parmi les contrats saisis, part de ceux dont le premier paiement est confirmé (décomptés). Total et par collaborateur, avec les ajustements manuels éventuels.",
    inputSchema: { type: "object", properties: { mois: monthArg }, additionalProperties: false },
    async run(args) {
      const month = readMonth(args);
      const [rows, names, adjRes] = await Promise.all([policiesOfMonth(month), peopleNames(), svc().from("pvq1_ajustements").select("user_id, pct, note").eq("month", month)]);
      const adj = Object.fromEntries(((adjRes.data as { user_id: string; pct: number; note: string | null }[] | null) ?? []).map((a) => [a.user_id, a]));
      const total = pvq1(rows);
      const owners = new Map<string, typeof rows>();
      for (const r of rows) owners.set(r.owner_id, [...(owners.get(r.owner_id) ?? []), r]);
      const parCollab = [...owners.entries()]
        .map(([id, rs]) => ({ id, p: pvq1(rs) }))
        .filter((x) => x.p.entered > 0)
        .map(({ id, p }) => ({
          collaborateur: names[id] ?? "?",
          saisis: p.entered,
          payes: p.paid,
          a_verifier: p.pending,
          non_paiement: p.unpaid,
          unites_decomptees: round(p.unitsPaid, 1),
          pvq1: pctLabel(p.pct),
          pvq1_ajuste: adj[id] ? `${Math.round(Number(adj[id].pct))} %${adj[id].note ? ` (${adj[id].note})` : ""}` : null,
        }))
        .sort((a, b) => b.a_verifier - a.a_verifier);
      return {
        mois: month,
        total: { saisis: total.entered, payes: total.paid, a_verifier: total.pending, non_paiement: total.unpaid, pvq1_contrats: pctLabel(total.pct), pvq1_unites: pctLabel(total.pctUnits), unites_decomptees: round(total.unitsPaid, 1), unites_en_attente: round(total.unitsPending, 1) },
        par_collaborateur: parCollab,
      };
    },
  },
  {
    name: "contrats_a_verifier",
    title: "Contrats dont le premier paiement est à vérifier",
    description: "Contrats saisis d'un mois dont le premier paiement n'est pas confirmé (étapes Contrat signé / Apparu en Rennelist) ou non effectué. 60 contrats au maximum.",
    inputSchema: {
      type: "object",
      properties: { mois: monthArg, collaborateur: { type: "string", description: "Partie du nom d'un collaborateur pour filtrer (facultatif)." } },
      additionalProperties: false,
    },
    async run(args) {
      const month = readMonth(args);
      const filtre = typeof args.collaborateur === "string" ? args.collaborateur.trim().toLowerCase() : "";
      const [rows, names] = await Promise.all([policiesOfMonth(month), peopleNames()]);
      const open = rows.filter((r) => (PENDING_STAGES.includes(r.deal_stage) || r.deal_stage === "Non paiement") && (!filtre || (names[r.owner_id] ?? "").toLowerCase().includes(filtre)));
      return {
        mois: month,
        total_correspondant: open.length,
        contrats: open.slice(0, 60).map((r) => ({ collaborateur: names[r.owner_id] ?? "?", client: r.client_name, produit: r.product_label, compagnie: r.partner, unites: round(Number(r.units) || 0, 1), etape: r.deal_stage, signe_le: r.signed_on })),
      };
    },
  },
  {
    name: "remuneration_nouveaux",
    title: "Rémunération des nouveaux (FT1 à FT3)",
    description: "Pour chaque collaborateur du nouveau système : date de début, clients, forfaits dus et payés, valeur des unités mises de côté, rattrapage estimé ou calculé. Tient compte des valeurs encodées à la main.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const { data } = await svc().from("people").select("id, name, rank, date_demarrage, agrement_fsma_at").not("date_demarrage", "is", null).order("name");
      const out = [];
      for (const p of (data as { id: string; name: string; rank: string; date_demarrage: string; agrement_fsma_at: string | null }[] | null) ?? []) {
        const s = await loadRemuSummary(svc(), p.id);
        out.push({
          collaborateur: p.name,
          rang: p.rank,
          debut: p.date_demarrage,
          agrement_fsma: p.agrement_fsma_at,
          clients: s.clientsCount,
          forfaits_dus: round(s.forfaitsTotal),
          forfaits_payes: round(s.forfaitsPayes),
          unites: round(s.unitsTotal, 1),
          valeur_unites_en_reserve: round(s.reserve),
          rattrapage_estime: round(s.rattrapageEstime),
          rattrapage_calcule: s.rattrapage ? { montant: round(s.rattrapage.montant), calcule_le: s.rattrapage.calcule_le, verse_le: s.rattrapage.verse_le } : null,
          valeurs_encodees_a_la_main: !!s.manuel,
        });
      }
      return { collaborateurs: out };
    },
  },
  {
    name: "pipeline_linkedin",
    title: "Pipeline LinkedIn de Justice",
    description: "Contacts LinkedIn de Justice par statut, par groupe, relances échues aujourd'hui et réponses à traiter.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run(_args, ctx) {
      const today = toISO(brusselsNow());
      const rows = await fetchAll<{ status: string; grp: string | null; priority: number | null; next_action: string | null }>((from, to) =>
        svc().from("linkedin_contacts").select("status, grp, priority, next_action").eq("owner_id", ctx.personId).order("id").range(from, to)
      );
      const count = (key: "status" | "grp") => rows.reduce<Record<string, number>>((m, r) => ((m[r[key] ?? "—"] = (m[r[key] ?? "—"] ?? 0) + 1), m), {});
      const terminal = ["Pas intéressé", "RDV fixé", "Dernier message envoyé"];
      return {
        aujourd_hui: today,
        total: rows.length,
        par_statut: count("status"),
        par_groupe: count("grp"),
        reponses_a_traiter: rows.filter((r) => r.status === "À toi de répondre").length,
        relances_echues: rows.filter((r) => r.next_action && r.next_action <= today && !terminal.includes(r.status) && r.status !== "À contacter").length,
        a_contacter_prioritaires: rows.filter((r) => r.status === "À contacter" && r.priority === 1).length,
      };
    },
  },
  {
    name: "prospects_resume",
    title: "Prospects de Justice",
    description: "Prospects de Justice par étape et par catégorie, et suivis échus.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run(_args, ctx) {
      const today = toISO(brusselsNow());
      const rows = await fetchAll<{ stage: string; category: string | null; next_follow_up: string | null }>((from, to) =>
        svc().from("prospects").select("stage, category, next_follow_up").eq("owner_id", ctx.personId).order("id").range(from, to)
      );
      const count = (key: "stage" | "category") => rows.reduce<Record<string, number>>((m, r) => ((m[r[key] ?? "—"] = (m[r[key] ?? "—"] ?? 0) + 1), m), {});
      return { aujourd_hui: today, total: rows.length, par_etape: count("stage"), par_categorie: count("category"), suivis_echus: rows.filter((r) => r.next_follow_up && r.next_follow_up <= today && r.stage !== "Perdu").length };
    },
  },
  {
    name: "suivi_appels",
    title: "Suivi des appels",
    description: "Nombre d'appels passés par chaque personne : aujourd'hui, cette semaine, ce mois-ci, au total, appels joints et rendez-vous pris ce mois-ci.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run() {
      const rows = await fetchAll<{ person_id: string; called_at: string; outcome: string }>((from, to) =>
        svc().from("call_log").select("person_id, called_at, outcome").order("called_at", { ascending: false }).range(from, to)
      );
      const names = await peopleNames();
      const now = brusselsNow();
      const today = toISO(now);
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const weekStart = toISO(monday);
      const monthStart = `${today.slice(0, 7)}-01`;
      const by = new Map<string, { aujourdhui: number; semaine: number; mois: number; total: number; joints_mois: number; rdv_mois: number }>();
      for (const r of rows) {
        const day = new Date(r.called_at).toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
        const a = by.get(r.person_id) ?? { aujourdhui: 0, semaine: 0, mois: 0, total: 0, joints_mois: 0, rdv_mois: 0 };
        a.total += 1;
        if (day === today) a.aujourdhui += 1;
        if (day >= weekStart) a.semaine += 1;
        if (day >= monthStart) {
          a.mois += 1;
          if (["Répondu", "RDV pris", "Pas intéressé", "À rappeler"].includes(r.outcome)) a.joints_mois += 1;
          if (r.outcome === "RDV pris") a.rdv_mois += 1;
        }
        by.set(r.person_id, a);
      }
      return { aujourd_hui: today, par_personne: [...by.entries()].map(([id, a]) => ({ personne: names[id] ?? "?", ...a })).sort((x, y) => y.mois - x.mois) };
    },
  },
  {
    name: "chercher_client",
    title: "Chercher un client par son nom",
    description: "Retrouve des clients par une partie de leur nom : collaborateur responsable, total d'unités, contrats (produit, compagnie, unités, étape, mois). Aucune coordonnée n'est renvoyée.",
    inputSchema: { type: "object", properties: { nom: { type: "string", description: "Au moins 2 caractères du nom du client." } }, required: ["nom"], additionalProperties: false },
    async run(args) {
      const nom = typeof args.nom === "string" ? args.nom.trim().replace(/[%,()]/g, " ") : "";
      if (nom.length < 2) throw new Error("Donne au moins 2 caractères du nom.");
      const { data, error } = await svc()
        .from("clients")
        .select("id, name, status, owner_id, total_units, total_worth, client_policies(product_label, partner, units, deal_stage, production_month)")
        .ilike("name", `%${nom}%`)
        .limit(10);
      if (error) throw new Error(error.message);
      const names = await peopleNames();
      return {
        resultats: ((data as unknown as { name: string; status: string | null; owner_id: string; total_units: number | null; total_worth: number | null; client_policies: { product_label: string | null; partner: string | null; units: number | null; deal_stage: string; production_month: string | null }[] }[] | null) ?? []).map((c) => ({
          client: c.name,
          statut: c.status,
          collaborateur: names[c.owner_id] ?? "?",
          unites_total: round(Number(c.total_units) || 0, 1),
          valeur_total: round(Number(c.total_worth) || 0),
          contrats: c.client_policies.map((p) => ({ produit: p.product_label, compagnie: p.partner, unites: round(Number(p.units) || 0, 1), etape: p.deal_stage, mois: p.production_month, decompte: PAID_STAGES.includes(p.deal_stage as DealStage) })),
        })),
      };
    },
  },
];
