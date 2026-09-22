import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { ModuleView } from "./module-view";
import type { TrainingModule, TrainingProgress, TrainingQuizQuestion } from "@/types/database";

export default async function TrainingModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const [{ data: modules }, { data: progress }, { data: module_ }, { data: questions }] = await Promise.all([
    supabase.from("training_modules").select("id, order_index").order("order_index"),
    supabase.from("training_progress").select("*").eq("person_id", person.id),
    supabase.from("training_modules").select("*").eq("id", moduleId).single(),
    supabase.from("training_questions_quiz").select("*").eq("module_id", moduleId).order("order_index"),
  ]);

  if (!module_) notFound();

  const modulesList = (modules as { id: string; order_index: number }[]) ?? [];
  const progressList = (progress as TrainingProgress[]) ?? [];
  const progressByModule = new Map(progressList.map((p) => [p.module_id, p]));

  const currentOrder = (module_ as TrainingModule).order_index;
  let unlocked = currentOrder === 0;
  if (!unlocked) {
    const previousModule = modulesList.find((m) => m.order_index === currentOrder - 1);
    unlocked = previousModule ? (progressByModule.get(previousModule.id)?.passed ?? false) : false;
  }
  if (!unlocked) notFound();

  const nextModule = modulesList.find((m) => m.order_index === currentOrder + 1) ?? null;
  const myProgress = progressByModule.get(moduleId) ?? null;

  return (
    <ModuleView
      trainingModule={module_ as TrainingModule}
      questions={(questions as TrainingQuizQuestion[]) ?? []}
      initialProgress={myProgress}
      nextModuleId={nextModule?.id ?? null}
    />
  );
}
