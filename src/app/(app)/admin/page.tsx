import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { PeoplePanel } from "./people-panel";
import { PayoutPanel } from "./payout-panel";
import { OvbImportPanel } from "./ovb-import-panel";
import { OvbPeriodsPanel } from "./ovb-periods-panel";
import { GeocodeBackfillPanel } from "./geocode-backfill-panel";
import { TrainingModulesPanel } from "./training-modules-panel";
import { TrainingDashboardPanel } from "./training-dashboard-panel";
import { TeamTrackingPanel } from "./team-tracking-panel";
import type { Goal, LinkedinSprint, OvbPeriod, Prospect, TrainingModule, TrainingQuestion, TrainingProgress } from "@/types/database";

export default async function AdminPage() {
  const person = await getCurrentPerson();
  if (!person) return null;
  if (!person.is_admin) notFound();

  const supabase = await createClient();
  const [
    { data: people },
    { data: ovbPeriods },
    { count: ungeocodedCount },
    { data: trainingModules },
    { data: trainingQuestions },
    { data: trainingProgress },
  ] = await Promise.all([
    supabase.from("people").select("*").order("name"),
    supabase.from("ovb_periods").select("*"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .is("lat", null)
      .not("address", "is", null),
    supabase.from("training_modules").select("*").order("order_index"),
    supabase.from("training_questions").select("*").order("order_index"),
    supabase.from("training_progress").select("*"),
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

  const modulesWithQuestions = ((trainingModules as TrainingModule[]) ?? []).map((m) => ({
    ...m,
    training_questions: ((trainingQuestions as TrainingQuestion[]) ?? []).filter((q) => q.module_id === m.id),
  }));

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
        <OvbImportPanel />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <OvbPeriodsPanel initialPeriods={(ovbPeriods as OvbPeriod[]) ?? []} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <GeocodeBackfillPanel initialCount={ungeocodedCount ?? 0} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <TrainingModulesPanel initialModules={modulesWithQuestions} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <TrainingDashboardPanel
          people={(people ?? []).map((p) => ({ id: p.id, name: p.name }))}
          modules={(trainingModules as TrainingModule[]) ?? []}
          progress={(trainingProgress as TrainingProgress[]) ?? []}
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
