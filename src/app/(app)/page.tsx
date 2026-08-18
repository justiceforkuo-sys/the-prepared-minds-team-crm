import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { TodayBoard } from "./today-board";

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
  const [{ data: activity }, { data: followUps }, { data: goals }] = await Promise.all([
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
  ]);

  return (
    <div>
      <div className="text-xs capitalize text-muted">{dateLabel}</div>
      <h2 className="mb-4 mt-0.5 font-serif text-xl font-semibold text-ink">
        Bonjour, {person.name.split(" ")[0]}
      </h2>
      <TodayBoard
        personId={person.id}
        today={today}
        initialActivity={activity ?? null}
        initialVision={person.vision}
        followUps={followUps ?? []}
        goals={goals ?? []}
      />
    </div>
  );
}
