import Link from "next/link";
import { CheckCircle2, Lock, ChevronRight } from "lucide-react";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import type { TrainingModule, TrainingProgress } from "@/types/database";

export default async function FormationContinuePage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const [{ data: modules }, { data: progress }] = await Promise.all([
    supabase.from("training_modules").select("*").order("order_index"),
    supabase.from("training_progress").select("*").eq("person_id", person.id),
  ]);

  const modulesList = (modules as TrainingModule[]) ?? [];
  const progressList = (progress as TrainingProgress[]) ?? [];
  const progressByModule = new Map(progressList.map((p) => [p.module_id, p]));

  const rows: { module: TrainingModule; progress: TrainingProgress | undefined; unlocked: boolean }[] = [];
  for (const m of modulesList) {
    const p = progressByModule.get(m.id);
    const unlocked = rows.length === 0 || (rows[rows.length - 1].progress?.passed ?? false);
    rows.push({ module: m, progress: p, unlocked });
  }

  const doneCount = rows.filter((r) => r.progress?.passed).length;

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Formation continue</h2>
      <div className="mt-1 mb-4 text-xs text-muted">
        {doneCount}/{modulesList.length} modules validés
      </div>

      {modulesList.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucun module pour l&apos;instant.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map(({ module: m, progress: p, unlocked }, i) => {
          const passed = p?.passed ?? false;
          const content = (
            <>
              {passed ? (
                <CheckCircle2 size={20} className="flex-shrink-0 text-green" />
              ) : unlocked ? (
                <div className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-[#c3cddc]" />
              ) : (
                <Lock size={18} className="flex-shrink-0 text-muted" />
              )}
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted">Module {i}</div>
                <div className={`text-sm font-bold ${unlocked ? "text-ink" : "text-muted"}`}>{m.title}</div>
                {p && (
                  <div className="mt-0.5 text-xs text-muted">
                    Meilleur score : {p.best_score}% {passed ? "— validé" : "— à retenter (min. 80%)"}
                  </div>
                )}
                {!unlocked && (
                  <div className="mt-0.5 text-xs text-muted">Termine le module précédent pour débloquer.</div>
                )}
              </div>
              {unlocked && <ChevronRight size={16} className="text-muted" />}
            </>
          );

          return unlocked ? (
            <Link
              key={m.id}
              href={`/formation-continue/${m.id}`}
              className="flex items-center gap-2.5 rounded-2xl border border-line bg-card p-3.5"
            >
              {content}
            </Link>
          ) : (
            <div
              key={m.id}
              className="flex items-center gap-2.5 rounded-2xl border border-line bg-card p-3.5 opacity-60"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
