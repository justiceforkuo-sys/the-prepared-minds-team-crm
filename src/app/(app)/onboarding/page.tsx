import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { OnboardingChecklist } from "./onboarding-checklist";
import { OnboardingTeam } from "./onboarding-team";

export default async function OnboardingPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const [{ data: progress }, { data: directPeople }] = await Promise.all([
    supabase.from("onboarding_progress").select("*").eq("person_id", person.id),
    supabase.from("people").select("id, name, rank").eq("reports_to", person.id).order("name"),
  ]);

  const directIds = (directPeople ?? []).map((d) => d.id);
  const { data: directProgress } =
    directIds.length > 0
      ? await supabase.from("onboarding_progress").select("*").in("person_id", directIds)
      : { data: [] };

  const recruits = (directPeople ?? []).map((d) => ({
    person: d,
    progress: (directProgress ?? []).filter((p) => p.person_id === d.id),
  }));

  return (
    <div>
      <OnboardingChecklist personId={person.id} initialProgress={progress ?? []} />
      <OnboardingTeam recruits={recruits} />
    </div>
  );
}
