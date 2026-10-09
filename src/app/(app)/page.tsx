import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { daysSince, mondayOf, toISO } from "@/lib/pilotage";
import { TodayBoard } from "./today-board";
import { DailyNumbers } from "./daily-numbers";
import { PipelineSection, type CallItem, type ReactivateClient, type StalledSale } from "./pipeline-section";
import type { DailyActivity, TeamProductionRow, CompanyRankingRow } from "@/types/database";

export default async function TodayPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const now = new Date();
  const dateLabel = now.toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = toISO(now);
  const weekStart = mondayOf(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);
  const in7Iso = toISO(in7);
  const stalledCutoff = new Date(now.getTime() - 7 * 86400000).toISOString();
  const reactivateCutoff = new Date(now.getTime() - 90 * 86400000).toISOString();

  const supabase = await createClient();
  const [
    { data: activity },
    { data: weekRows },
    { data: followUps },
    { data: goals },
    { data: tasks },
    { data: reminders },
    { data: production },
    { data: companyRanking },
    { data: stalled },
    { data: toReactivate, count: reactivateTotal },
  ] = await Promise.all([
    supabase.from("daily_activity").select("*").eq("person_id", person.id).eq("date", today).maybeSingle(),
    supabase
      .from("daily_activity")
      .select("*")
      .eq("person_id", person.id)
      .gte("date", toISO(weekStart))
      .lte("date", toISO(weekEnd)),
    supabase
      .from("prospects")
      .select("id, name, stage, next_follow_up")
      .eq("owner_id", person.id)
      .not("next_follow_up", "is", null)
      .lte("next_follow_up", in7Iso)
      .not("stage", "in", "(Perdu,Partenaire)")
      .order("next_follow_up"),
    supabase.from("goals").select("*").eq("person_id", person.id).eq("done", false).order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, due_date, assigner:people!tasks_assigned_by_fkey(name)")
      .eq("assigned_to", person.id)
      .eq("done", false)
      .not("due_date", "is", null)
      .lte("due_date", in7Iso)
      .order("due_date"),
    supabase
      .from("payment_reminders")
      .select("id, remind_on, client_policy:client_policies(product_label, client:clients(name))")
      .eq("status", "pending")
      .lte("remind_on", today)
      .order("remind_on"),
    supabase.rpc("get_team_production"),
    supabase.rpc("get_company_ranking"),
    supabase
      .from("prospects")
      .select("id, name, stage, updated_at")
      .eq("owner_id", person.id)
      .eq("category", "client")
      .in("stage", ["RDV pris", "Entretien / Dossier"])
      .lt("updated_at", stalledCutoff)
      .order("updated_at")
      .limit(6),
    supabase
      .from("clients")
      .select("id, name, last_contact_at, created_at", { count: "exact" })
      .eq("owner_id", person.id)
      .eq("status", "Client")
      .or(`last_contact_at.lt.${reactivateCutoff},and(last_contact_at.is.null,created_at.lt.${reactivateCutoff})`)
      .order("created_at")
      .limit(8),
  ]);

  const productionRows = (production as TeamProductionRow[] | null) ?? [];
  const myProduction = productionRows.find((r) => r.depth === 0);
  const groupUnitsThisMonth = productionRows
    .filter((r) => r.depth === 1)
    .reduce((s, r) => s + r.units_this_month, 0);

  const ranking = (companyRanking as CompanyRankingRow[] | null) ?? [];
  const position = ranking.findIndex((r) => r.person_id === person.id) + 1;

  const taskList = (tasks as unknown as { id: string; title: string; due_date: string; assigner: { name: string } | null }[]) ?? [];
  const followList = followUps ?? [];
  const reminderList =
    (reminders as unknown as {
      id: string;
      remind_on: string;
      client_policy: { product_label: string | null; client: { name: string } | null } | null;
    }[]) ?? [];

  const callItems: CallItem[] = [
    ...followList.map<CallItem>((p) => ({
      id: p.id,
      kind: "suivi",
      label: p.name,
      sub: `Suivi — ${p.stage}`,
      date: p.next_follow_up as string,
    })),
    ...taskList.map<CallItem>((t) => ({
      id: t.id,
      kind: "tache",
      label: t.title,
      sub: t.assigner ? `Tâche de ${t.assigner.name}` : "Tâche",
      date: t.due_date,
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const lateCount = callItems.filter((c) => c.date < today).length;
  const todayCount = callItems.filter((c) => c.date === today).length;
  const upcomingCount = callItems.filter((c) => c.date > today).length;

  const stalledSales: StalledSale[] = (stalled ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    stage: s.stage,
    daysSinceUpdate: daysSince(s.updated_at, now),
  }));

  const reactivate: ReactivateClient[] = (toReactivate ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    daysSinceContact: daysSince(c.last_contact_at ?? c.created_at, now),
  }));

  return (
    <div>
      <div className="text-xs capitalize text-muted">{dateLabel}</div>
      <h2 className="mb-4 mt-0.5 font-serif text-xl font-semibold text-ink">
        Bonjour, {person.name.split(" ")[0]}
      </h2>
      <DailyNumbers
        personId={person.id}
        today={today}
        todayRow={(activity as DailyActivity | null) ?? null}
        weekRows={(weekRows as DailyActivity[] | null) ?? []}
        unitsThisMonth={myProduction?.units_this_month ?? 0}
      />
      <PipelineSection
        today={today}
        lateCount={lateCount}
        todayCount={todayCount}
        upcomingCount={upcomingCount}
        reminderCount={reminderList.length}
        callPlan={callItems.slice(0, 8)}
        stalledSales={stalledSales}
        reactivate={reactivate}
        reactivateTotal={reactivateTotal ?? reactivate.length}
      />
      <TodayBoard
        personId={person.id}
        myRank={person.rank}
        today={today}
        initialActivity={activity ?? null}
        initialVision={person.vision}
        goals={goals ?? []}
        paymentReminders={reminderList}
        unitsThisMonth={myProduction?.units_this_month ?? 0}
        groupUnitsThisMonth={groupUnitsThisMonth}
        top3={ranking.slice(0, 3)}
        rankingPosition={position}
        rankingTotal={ranking.length}
      />
    </div>
  );
}
