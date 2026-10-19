import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { brusselsNow, daysSince, mondayOf, toISO } from "@/lib/pilotage";
import { FOLLOW_UP_COLUMNS, TERMINAL_STAGES_FILTER, WEEK_HORIZON_DAYS, addDaysIso, bucketFollowUps, type FollowUpRow } from "@/lib/follow-ups";
import { TodayBoard } from "./today-board";
import { CandidatesToCall, type CallbackCandidate } from "./candidates-to-call";
import { OPEN_STATUSES, needsCallback, type RecruitmentRow } from "@/lib/recruitment";
import { DailyNumbers } from "./daily-numbers";
import { PipelineSection, type CallItem, type ReactivateClient, type StalledSale, type TaskItem } from "./pipeline-section";
import type { DailyActivity, TeamProductionRow, CompanyRankingRow } from "@/types/database";

export default async function TodayPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const now = brusselsNow();
  const dateLabel = now.toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = toISO(now);
  const weekStart = mondayOf(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const in7Iso = addDaysIso(today, WEEK_HORIZON_DAYS);
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
    { data: recruitRows },
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
      .select(FOLLOW_UP_COLUMNS)
      .eq("owner_id", person.id)
      .not("next_follow_up", "is", null)
      .lte("next_follow_up", in7Iso)
      .not("stage", "in", TERMINAL_STAGES_FILTER)
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
    supabase
      .from("recruitment_applications")
      .select("id, name, status, created_at, next_action, next_action_date")
      .eq("owner_id", person.id)
      .in("status", OPEN_STATUSES),
  ]);

  const productionRows = (production as TeamProductionRow[] | null) ?? [];
  const myProduction = productionRows.find((r) => r.depth === 0);
  const groupUnitsThisMonth = productionRows
    .filter((r) => r.depth === 1)
    .reduce((s, r) => s + r.units_this_month, 0);

  const ranking = (companyRanking as CompanyRankingRow[] | null) ?? [];
  const position = ranking.findIndex((r) => r.person_id === person.id) + 1;

  const taskList = (tasks as unknown as { id: string; title: string; due_date: string; assigner: { name: string } | null }[]) ?? [];
  // Suivis de prospects : exactement la même définition que le bandeau « À relancer » de /prospects
  const followBuckets = bucketFollowUps((followUps as FollowUpRow[] | null) ?? [], person.id, today);
  const reminderList =
    (reminders as unknown as {
      id: string;
      remind_on: string;
      client_policy: { product_label: string | null; client: { name: string } | null } | null;
    }[]) ?? [];

  const callItems: CallItem[] = [...followBuckets.late, ...followBuckets.today, ...followBuckets.week].map((p) => ({
    id: p.id,
    label: p.name,
    sub: `Suivi — ${p.stage}`,
    date: p.next_follow_up as string,
  }));

  // Tâches (agenda) : comptées à part, jamais mélangées aux suivis de prospects
  const taskItems: TaskItem[] = taskList.map((t) => ({
    id: t.id,
    title: t.title,
    sub: t.assigner ? `Tâche de ${t.assigner.name}` : "Tâche",
    date: t.due_date,
  }));

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

  // Candidats à rappeler : « Nouveau » depuis plus de 24 h, ou prochaine action arrivée à échéance
  const callbacks: CallbackCandidate[] = ((recruitRows as Pick<RecruitmentRow, "id" | "name" | "status" | "created_at" | "next_action" | "next_action_date">[] | null) ?? [])
    .filter((c) => needsCallback(c, today, now))
    .map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      reason: c.next_action_date && c.next_action_date <= today ? `${c.next_action ?? "Rappel prévu"} · ${c.next_action_date}` : `Nouveau depuis ${daysSince(c.created_at, now)} j`,
      urgent: c.status === "Nouveau" && (now.getTime() - new Date(c.created_at).getTime()) / 3600000 >= 48,
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
        lateCount={followBuckets.late.length}
        todayCount={followBuckets.today.length}
        upcomingCount={followBuckets.week.length}
        tasks={taskItems}
        reminderCount={reminderList.length}
        callPlan={callItems.slice(0, 8)}
        stalledSales={stalledSales}
        reactivate={reactivate}
        reactivateTotal={reactivateTotal ?? reactivate.length}
      />
      <CandidatesToCall items={callbacks} />
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
