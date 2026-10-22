import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { PeoplePanel } from "./people-panel";
import { PayoutPanel } from "./payout-panel";
import { OvbImportPanel } from "./ovb-import-panel";
import { OvbPeriodsPanel } from "./ovb-periods-panel";
import { GeocodeBackfillPanel } from "./geocode-backfill-panel";
import { TeamTrackingPanel } from "./team-tracking-panel";
import { RecruitmentSettingsPanel } from "./recruitment-settings-panel";
import { RemunerationPanel, type RemuPersonRow } from "./remuneration-panel";
import { InboundLogPanel, type InboundAdminRow } from "./inbound-log-panel";
import { TiroirsPanel } from "./tiroirs-panel";
import { SolutionsEditorsPanel } from "./solutions-editors-panel";
import type { Tiroir } from "@/lib/idees";
import { webhookKey } from "@/lib/webhook-keys";
import { loadRemuSummary } from "@/lib/remuneration-data";
import { brusselsNow, toISO } from "@/lib/pilotage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaremeRow } from "@/lib/remuneration";
import type { Goal, LinkedinSprint, OvbPeriod, Prospect } from "@/types/database";

export default async function AdminPage() {
  const person = await getCurrentPerson();
  if (!person) return null;
  if (!person.is_admin) notFound();

  const supabase = await createClient();
  const [{ data: people }, { data: ovbPeriods }, { count: ungeocodedCount }, { data: slotSetting }] = await Promise.all([
    supabase.from("people").select("*").order("name"),
    supabase.from("ovb_periods").select("*"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .is("lat", null)
      .not("address", "is", null),
    supabase.from("app_settings").select("value").eq("key", "recruitment_training_slots").maybeSingle(),
  ]);

  // Sprint LinkedIn / Objectifs sont des tables RLS "person_id = soi-même
  // uniquement" (pas de bypass admin) — client service role pour agréger
  // tous les collaborateurs sur cette page déjà verrouillée is_admin.
  const serviceSupabase = createServiceClient();
  const [{ data: allSprints }, { data: allProspects }, { data: allGoals }] = await Promise.all([
    serviceSupabase.from("linkedin_sprints").select("*"),
    serviceSupabase.from("prospects").select("*"),
    serviceSupabase.from("goals").select("*"),
  ]);

  // Rémunération des collaborateurs démarrés à partir du 1er janvier 2026
  const svc = serviceSupabase as unknown as SupabaseClient;
  const [{ data: remuPeople }, { data: baremeRows }, { data: valeurRows }] = await Promise.all([
    svc.from("people").select("id, name, rank, date_demarrage, agrement_fsma_at").not("date_demarrage", "is", null).order("name"),
    supabase.from("bareme_forfait_client").select("id, rang_min, rang_max, montant, date_effet").order("rang_min").order("date_effet"),
    supabase.from("valeur_point_rang").select("rang, valeur"),
  ]);
  const remuRows: RemuPersonRow[] = await Promise.all(
    ((remuPeople as { id: string; name: string; rank: string; date_demarrage: string; agrement_fsma_at: string | null }[] | null) ?? []).map(async (p) => {
      const sum = await loadRemuSummary(svc, p.id);
      return {
        id: p.id,
        name: p.name,
        rank: p.rank,
        date_demarrage: p.date_demarrage,
        agrement_fsma_at: p.agrement_fsma_at,
        clients: sum.forfaits.length,
        forfaitsTotal: sum.forfaitsTotal,
        forfaitsPayes: sum.forfaitsPayes,
        unpaid: sum.forfaits.filter((f) => !f.paye_le).length,
        reserve: sum.reserve,
        unitsTotal: sum.unitsTotal,
        rattrapage: sum.rattrapage,
      };
    })
  );
  // Journal des emails LinkedIn reçus (bloc 7, voie 1)
  const { data: inboundRows } = await svc
    .from("linkedin_inbound_log")
    .select("id, received_at, subject, result, detail, raw_body, owner:people(name)")
    .order("received_at", { ascending: false })
    .limit(60);
  const inbound: InboundAdminRow[] = ((inboundRows as unknown as { id: string; received_at: string; subject: string | null; result: string; detail: string | null; raw_body: string | null; owner: { name: string } | { name: string }[] | null }[] | null) ?? []).map((r) => {
    const o = Array.isArray(r.owner) ? r.owner[0] : r.owner;
    return { id: r.id, received_at: r.received_at, owner_name: o?.name ?? null, subject: r.subject, result: r.result, detail: r.detail, hasRaw: !!r.raw_body };
  });
  const inboundEndpoint = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-prepared-minds-team-crm.vercel.app"}/api/inbound/linkedin?key=${webhookKey("inbound-linkedin")}`;
  const { data: tiroirRows } = await supabase.from("tiroirs").select("*").order("numero");
  const inRemu = new Set(remuRows.map((r) => r.id));
  const RANK_ORDER = ["JFAI", "JFAII", "JFAIII", "FA", "FC", "CD", "CR", "CN"];
  const valeurs = ((valeurRows as { rang: string; valeur: number }[] | null) ?? [])
    .map((v) => ({ rang: v.rang, valeur: Number(v.valeur) }))
    .sort((a, b) => RANK_ORDER.indexOf(a.rang) - RANK_ORDER.indexOf(b.rang));

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Admin</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Édition complète des fiches et des décomptes — visible uniquement par toi.
      </p>

      <PeoplePanel people={people ?? []} meId={person.id} />

      <div className="mt-4">
        <PayoutPanel people={people ?? []} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <RemunerationPanel
          rows={remuRows}
          candidates={(people ?? []).filter((p) => !inRemu.has(p.id) && p.active).map((p) => ({ id: p.id, name: p.name }))}
          bareme={((baremeRows as BaremeRow[] | null) ?? []).map((b) => ({ ...b, montant: Number(b.montant) }))}
          valeurs={valeurs}
          today={toISO(brusselsNow())}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <InboundLogPanel rows={inbound} endpoint={inboundEndpoint} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <SolutionsEditorsPanel people={(people ?? []).filter((p) => p.active).map((p) => ({ id: p.id, name: p.name, editor: (p as { peut_editer_solutions?: boolean }).peut_editer_solutions === true }))} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <TiroirsPanel initial={(tiroirRows as Tiroir[] | null) ?? []} people={(people ?? []).filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <OvbImportPanel />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <OvbPeriodsPanel initialPeriods={(ovbPeriods as OvbPeriod[]) ?? []} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <GeocodeBackfillPanel initialCount={ungeocodedCount ?? 0} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <RecruitmentSettingsPanel
          initialSlots={Array.isArray(slotSetting?.value) ? (slotSetting.value as unknown[]).filter((s): s is string => typeof s === "string") : []}
          adminId={person.id}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <TeamTrackingPanel
          people={(people ?? []).map((p) => ({ id: p.id, name: p.name }))}
          sprints={(allSprints as LinkedinSprint[]) ?? []}
          prospects={(allProspects as Prospect[]) ?? []}
          goals={(allGoals as Goal[]) ?? []}
        />
      </div>
    </div>
  );
}
