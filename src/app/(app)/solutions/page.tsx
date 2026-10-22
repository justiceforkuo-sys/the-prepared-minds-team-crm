import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { SolutionsBoard } from "./solutions-board";
import { reviewReason, type Solution, type SolutionDocument } from "@/lib/solutions";

export default async function SolutionsPage() {
  const person = await getCurrentPerson();
  if (!person) return null;
  const canEdit = person.is_admin || (person as { peut_editer_solutions?: boolean }).peut_editer_solutions === true;

  const supabase = await createClient();
  const [{ data: solutionRows }, { data: docRows }] = await Promise.all([
    supabase.from("solutions").select("*").order("ordre").order("nom"),
    supabase.from("solution_documents").select("solution_id, depose_le"),
  ]);
  const solutions = (solutionRows as Solution[] | null) ?? [];
  const docs = (docRows as Pick<SolutionDocument, "solution_id" | "depose_le">[] | null) ?? [];
  const today = toISO(brusselsNow());

  const items = solutions.map((s) => {
    const own = docs.filter((d) => d.solution_id === s.id);
    return { solution: s, docCount: own.length, review: canEdit ? reviewReason(s, own, today) : null };
  });

  return <SolutionsBoard items={items} canEdit={canEdit} />;
}
