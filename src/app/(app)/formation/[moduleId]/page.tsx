import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { FORMATION_MODULES } from "@/lib/formation-modules";
import { FormationSlideshow } from "./formation-slideshow";

export default async function FormationModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const module_ = FORMATION_MODULES.find((m) => m.id === moduleId);
  if (!module_) notFound();

  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const { data: progress } = await supabase
    .from("formation_progress")
    .select("done")
    .eq("person_id", person.id)
    .eq("module_id", moduleId)
    .maybeSingle();

  return (
    <FormationSlideshow
      personId={person.id}
      person={{ name: person.name, rank: person.rank, phone: person.phone, email: person.email }}
      module={module_}
      initialDone={progress?.done ?? false}
    />
  );
}
