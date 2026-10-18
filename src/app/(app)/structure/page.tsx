import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { brusselsNow, rangeFor } from "@/lib/pilotage";
import { StructureBoard } from "./structure-board";
import { GroupEngagement } from "./group-engagement";
import type { TeamEngagementRow, TeamNumbersRow } from "@/types/database";

export default async function StructurePage() {
  const person = await getCurrentPerson();
  if (!person) return null;
  if (person.status === "essai") notFound();

  const now = brusselsNow();
  const week = rangeFor("semaine", now);
  const month = rangeFor("mois", now);
  const monthKey = month.start.slice(0, 7);

  const supabase = await createClient();
  const [{ data: weekNumbers }, { data: monthNumbers }, { data: engagements }] = await Promise.all([
    supabase.rpc("get_team_numbers", { p_start: week.start, p_end: week.end }),
    supabase.rpc("get_team_numbers", { p_start: month.start, p_end: month.end }),
    supabase.rpc("get_team_engagements", { p_month: monthKey }),
  ]);

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Structure</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Vue d&apos;ensemble de toute ta cascade : activité (DV/DR), unités et dossiers par collaborateur.
      </p>

      <GroupEngagement
        monthLabel={month.label}
        engagements={(engagements as TeamEngagementRow[] | null) ?? []}
        monthNumbers={(monthNumbers as TeamNumbersRow[] | null) ?? []}
      />

      <StructureBoard
        initialKind="semaine"
        initialAnchorIso={now.toISOString()}
        initialRows={(weekNumbers as TeamNumbersRow[] | null) ?? []}
      />
    </div>
  );
}
