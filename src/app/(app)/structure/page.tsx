import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { brusselsNow, periodProgress, productionPeriodFor, rangeFor, type OvbPeriodLite } from "@/lib/pilotage";
import { StructureBoard } from "./structure-board";
import { GroupEngagement } from "./group-engagement";
import type { TeamEngagementRow, TeamNumbersRow } from "@/types/database";

export default async function StructurePage() {
  const person = await getCurrentPerson();
  if (!person) return null;
  if (person.status === "essai") notFound();

  const now = brusselsNow();
  const week = rangeFor("semaine", now);

  const supabase = await createClient();
  const { data: periodRows } = await supabase.from("ovb_periods").select("period_month, start_date");
  const periods = (periodRows as OvbPeriodLite[] | null) ?? [];
  // Le "mois" de production est la période OVB, comme sur l'accueil et le Tableau.
  const period = productionPeriodFor(periods, now);

  const [{ data: weekNumbers }, { data: monthNumbers }, { data: engagements }] = await Promise.all([
    supabase.rpc("get_team_numbers", { p_start: week.start, p_end: week.end }),
    supabase.rpc("get_team_numbers", { p_start: period.start, p_end: period.end }),
    supabase.rpc("get_team_engagements", { p_month: period.key }),
  ]);

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Structure</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Vue d&apos;ensemble de toute ta cascade : activité (DV/DR), unités et dossiers par collaborateur.
      </p>

      <GroupEngagement
        periodLabel={period.label}
        progress={periodProgress(period, now)}
        engagements={(engagements as TeamEngagementRow[] | null) ?? []}
        monthNumbers={(monthNumbers as TeamNumbersRow[] | null) ?? []}
      />

      <StructureBoard
        initialKind="semaine"
        initialAnchorIso={now.toISOString()}
        periods={periods}
        initialRows={(weekNumbers as TeamNumbersRow[] | null) ?? []}
      />
    </div>
  );
}
