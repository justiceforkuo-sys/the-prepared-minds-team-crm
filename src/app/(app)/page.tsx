import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { TodayBoard } from "./today-board";
import type { TeamProductionRow, CompanyRankingRow } from "@/types/database";

export default async function TodayPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const dateLabel = new Date().toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: activity }, { data: followUps }, { data: goals }, { data: tasks }, { data: production }, { data: companyRanking }] =
    await Promise.all([
      supabase.from("daily_activity").select("*").eq("person_id", person.id).eq("date", today).maybeSingle(),
      supabase
        .from("prospects")
        .select("id, name, stage, next_follow_up")
        .eq("owner_id", person.id)
        .not("next_follow_up", "is", null)
        .lte("next_follow_up", today)
        .not("stage", "in", "(Perdu,Partenaire)")
        .order("next_follow_up"),
      supabase.from("goals").select("*").eq("person_id", person.id).eq("done", false).order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, title, due_date, assigner:people!tasks_assigned_by_fkey(name)")
        .eq("assigned_to", person.id)
        .eq("done", false)
        .not("due_date", "is", null)
        .lte("due_date", today)
        .order("due_date"),
      supabase.rpc("get_team_production"),
      supabase.rpc("get_company_ranking"),
    ]);

  const productionRows = (production as TeamProductionRow[] | null) ?? [];
  const myProduction = productionRows.find((r) => r.depth === 0);
  const groupUnitsThisMonth = productionRows
    .filter((r) => r.depth === 1)
    .reduce((s, r) => s + r.units_this_month, 0);

  const ranking = (companyRanking as CompanyRankingRow[] | null) ?? [];
  const position = ranking.findIndex((r) => r.person_id === person.id) + 1;

  return (
    <div>
      <div className="text-xs capitalize text-muted">{dateLabel}</div>
      <h2 className="mb-4 mt-0.5 font-serif text-xl font-semibold text-ink">
        Bonjour, {person.name.split(" ")[0]}
      </h2>
      <TodayBoard
        personId={person.id}
        myRank={person.rank}
        today={today}
        initialActivity={activity ?? null}
        initialVision={person.vision}
        followUps={followUps ?? []}
        goals={goals ?? []}
        tasks={(tasks as unknown as { id: string; title: string; due_date: string | null; assigner: { name: string } | null }[]) ?? []}
        unitsThisMonth={myProduction?.units_this_month ?? 0}
        groupUnitsThisMonth={groupUnitsThisMonth}
        top3={ranking.slice(0, 3)}
        rankingPosition={position}
        rankingTotal={ranking.length}
      />
    </div>
  );
}
