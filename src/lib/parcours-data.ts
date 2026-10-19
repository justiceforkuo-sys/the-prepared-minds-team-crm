import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import {
  TARGET_UNITS,
  addDays,
  type CohortRow,
  type Ctx,
  type Etape,
  type Extras,
  type ModuleRow,
  type PersonParcours,
  type Progression,
  type RythmeRow,
} from "@/lib/parcours";

export interface ParcoursData {
  rows: CohortRow[];
  etapes: Etape[];
  persons: Record<string, PersonParcours & { name: string }>;
  progression: Progression[];
  modules: ModuleRow[];
  rythme: RythmeRow[];
  extras: Record<string, Extras>;
  promoted: string[]; // personnes passées FT2 / JFA II pendant ce chargement (célébration)
}

const EMPTY: ParcoursData = { rows: [], etapes: [], persons: {}, progression: [], modules: [], rythme: [], extras: {}, promoted: [] };

export function ctxFor(data: ParcoursData, personId: string): Ctx | null {
  const row = data.rows.find((r) => r.person_id === personId);
  const person = data.persons[personId];
  if (!row || !person) return null;
  const modules: Ctx["modules"] = {};
  for (const m of data.modules) if (m.user_id === personId) modules[m.module] = m;
  return { row, person, modules, extras: data.extras[personId] ?? { prospectsSansRelance: 0, recoNonContactees: 0, dvSansRecos: 0 } };
}

/**
 * Charge le parcours de tous les collaborateurs que le lecteur peut voir (lui-même, sa cascade ; l'admin voit tout).
 * La RLS décide qui est visible ; le service role ne sert qu'à compter (prospects, activité) pour ces personnes
 * et à appliquer le passage FT2 / JFA II dès que les 1 000 unités sont atteintes.
 */
export async function loadParcours(supabase: SupabaseClient): Promise<ParcoursData> {
  const [{ data: cohort }, { data: etapes }] = await Promise.all([
    supabase.rpc("parcours_cohort"),
    supabase.from("parcours_etapes").select("*").eq("actif", true).order("ordre"),
  ]);
  const rows = ((cohort as CohortRow[] | null) ?? []).map((r) => ({ ...r }));
  if (rows.length === 0) return { ...EMPTY, etapes: (etapes as Etape[] | null) ?? [] };
  const ids = rows.map((r) => r.person_id);

  const [{ data: people }, { data: progression }, { data: modules }, { data: rythme }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, vision, rank, statut_reglementaire, agrement_statut, agrement_depose_at, agrement_fsma_at, ft2_at, autonome_at")
      .in("id", ids),
    supabase.from("parcours_progression").select("*").in("user_id", ids),
    supabase.from("modules_fsma").select("*").in("user_id", ids),
    supabase.from("parcours_rythme").select("*").in("user_id", ids),
  ]);
  const persons: ParcoursData["persons"] = {};
  for (const p of (people as (PersonParcours & { name: string })[] | null) ?? []) persons[p.id] = p;

  // Comptages (service role, limités aux personnes déjà autorisées ci-dessus)
  const service = createServiceClient() as unknown as SupabaseClient;
  const now = brusselsNow();
  const today = toISO(now);
  const yesterday = addDays(today, -1);
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const [{ data: noFollow }, { data: recos }, { data: daily }] = await Promise.all([
    service.from("prospects").select("owner_id").in("owner_id", ids).is("next_follow_up", null).not("stage", "in", "(Perdu,Partenaire,Sans suite)"),
    service.from("prospects").select("owner_id, stage, created_at, updated_at").in("owner_id", ids).ilike("source", "recommandation%").lt("created_at", cutoff),
    service.from("daily_activity").select("person_id, dv_realises, recomm_dv").in("person_id", ids).gte("date", yesterday),
  ]);

  const extras: Record<string, Extras> = {};
  for (const id of ids) extras[id] = { prospectsSansRelance: 0, recoNonContactees: 0, dvSansRecos: 0 };
  for (const r of (noFollow as { owner_id: string }[] | null) ?? []) extras[r.owner_id].prospectsSansRelance += 1;
  for (const r of (recos as { owner_id: string; stage: string; created_at: string; updated_at: string }[] | null) ?? []) {
    const untouched = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() < 60000;
    if (untouched && ["Contact", "Contacté"].includes(r.stage)) extras[r.owner_id].recoNonContactees += 1;
  }
  for (const r of (daily as { person_id: string; dv_realises: number; recomm_dv: number }[] | null) ?? []) {
    if (r.dv_realises > 0 && r.recomm_dv < 5 * r.dv_realises) extras[r.person_id].dvSansRecos += 1;
  }

  // Passage FT2 / JFA II : validé immédiatement dès 1 000 unités (sans attendre la semaine 8)
  const promoted: string[] = [];
  for (const r of rows) {
    const p = persons[r.person_id];
    if (p && !p.ft2_at && Number(r.units) >= TARGET_UNITS) {
      const patch: Record<string, unknown> = { ft2_at: today };
      if (p.rank === "JFAI") patch.rank = "JFAII";
      const { error } = await service.from("people").update(patch).eq("id", p.id);
      if (!error) {
        p.ft2_at = today;
        if (patch.rank) {
          p.rank = "JFAII";
          r.rank = "JFAII";
        }
        promoted.push(p.id);
      }
    }
  }

  return {
    rows,
    etapes: (etapes as Etape[] | null) ?? [],
    persons,
    progression: (progression as Progression[] | null) ?? [],
    modules: (modules as ModuleRow[] | null) ?? [],
    rythme: (rythme as RythmeRow[] | null) ?? [],
    extras,
    promoted,
  };
}
