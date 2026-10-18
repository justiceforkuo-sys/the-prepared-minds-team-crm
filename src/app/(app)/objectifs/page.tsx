import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { brusselsNow, rangeFor } from "@/lib/pilotage";
import { ObjectifsList } from "./objectifs-list";
import { EngagementCalculator } from "./engagement-calculator";
import { EngagementPanel } from "./engagement-panel";
import type { DailyActivity, MonthlyEngagement, TeamProductionRow } from "@/types/database";

export default async function ObjectifsPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const now = brusselsNow();
  const month = rangeFor("mois", now);
  const monthKey = month.start.slice(0, 7);

  const supabase = await createClient();
  const [{ data: goals }, { data: engagement }, { data: monthRows }, { data: production }] = await Promise.all([
    supabase.from("goals").select("*").eq("person_id", person.id).order("created_at", { ascending: false }),
    supabase.from("monthly_engagements").select("*").eq("person_id", person.id).eq("month", monthKey).maybeSingle(),
    supabase.from("daily_activity").select("*").eq("person_id", person.id).gte("date", month.start).lte("date", month.end),
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
        month={monthKey}
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
