import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { brusselsNow, periodProgress, productionPeriodFor, type OvbPeriodLite } from "@/lib/pilotage";
import { ObjectifsList } from "./objectifs-list";
import { EngagementCalculator } from "./engagement-calculator";
import { EngagementPanel } from "./engagement-panel";
import type { DailyActivity, MonthlyEngagement, TeamProductionRow } from "@/types/database";

export default async function ObjectifsPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const now = brusselsNow();

  const supabase = await createClient();
  const { data: periodRows } = await supabase.from("ovb_periods").select("period_month, start_date");
  // Le "mois" de production est la période OVB (comme l'accueil et le Tableau), pas le mois calendaire.
  const period = productionPeriodFor((periodRows as OvbPeriodLite[] | null) ?? [], now);

  const [{ data: goals }, { data: engagement }, { data: monthRows }, { data: production }] = await Promise.all([
    supabase.from("goals").select("*").eq("person_id", person.id).order("created_at", { ascending: false }),
    supabase.from("monthly_engagements").select("*").eq("person_id", person.id).eq("month", period.key).maybeSingle(),
    supabase.from("daily_activity").select("*").eq("person_id", person.id).gte("date", period.start).lte("date", period.end),
    supabase.rpc("get_team_production"),
  ]);

  const rows = (monthRows as DailyActivity[] | null) ?? [];
  const sum = (key: "dv_realises" | "dr_realises" | "dossiers") => rows.reduce((s, r) => s + (r[key] ?? 0), 0);
  const me = ((production as TeamProductionRow[] | null) ?? []).find((r) => r.depth === 0);
  const eng = engagement as MonthlyEngagement | null;

  return (
    <div>
      <EngagementPanel
        personId={person.id}
        month={period.key}
        periodLabel={period.label}
        progress={periodProgress(period, now)}
        initialUnites={eng?.objectif_unites ?? 0}
        initialRecrues={eng?.objectif_recrues ?? 0}
        totals={{
          units: me?.units_this_month ?? 0,
          dvRealises: sum("dv_realises"),
          drRealises: sum("dr_realises"),
          dossiers: sum("dossiers"),
        }}
      />
      <EngagementCalculator />
      <ObjectifsList personId={person.id} initialGoals={goals ?? []} />
    </div>
  );
}
