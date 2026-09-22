"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fmtDate } from "@/lib/format";
import type { TrainingModule, TrainingProgress } from "@/types/database";

interface PersonLite {
  id: string;
  name: string;
}

export function TrainingDashboardPanel({
  people,
  modules,
  progress,
}: {
  people: PersonLite[];
  modules: TrainingModule[];
  progress: TrainingProgress[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);

  const rows = people.map((p) => {
    const mine = progress.filter((pr) => pr.person_id === p.id);
    const passedCount = mine.filter((pr) => pr.passed).length;
    const byModuleId = new Map(mine.map((pr) => [pr.module_id, pr]));

    let currentModule: TrainingModule | null = null;
    for (const m of sortedModules) {
      if (!byModuleId.get(m.id)?.passed) {
        currentModule = m;
        break;
      }
    }

    return { person: p, passedCount, currentModule, byModuleId };
  });

  if (modules.length === 0) {
    return (
      <div>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          Formation continue — suivi
        </div>
        <p className="text-xs text-muted">Crée d&apos;abord un module ci-dessus.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Formation continue — suivi</div>
      <div className="flex flex-col gap-2">
        {rows.map(({ person, passedCount, currentModule, byModuleId }) => {
          const isOpen = openId === person.id;
          return (
            <div key={person.id} className="rounded-2xl border border-line bg-card p-3.5">
              <button
                onClick={() => setOpenId(isOpen ? null : person.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <div className="text-sm font-bold text-ink">{person.name}</div>
                  <div className="text-xs text-muted">
                    {currentModule ? `Module actuel : ${currentModule.title}` : "Tous les modules validés"}
                    {" · "}
                    {passedCount}/{modules.length} validés
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
              </button>

              {isOpen && (
                <div className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
                  {sortedModules.map((m) => {
                    const pr = byModuleId.get(m.id);
                    return (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <span className="text-ink">{m.title}</span>
                        <span className={pr?.passed ? "font-bold text-green" : "text-muted"}>
                          {pr
                            ? `${pr.best_score}% ${pr.passed ? `— validé le ${fmtDate(pr.passed_at ?? pr.updated_at)}` : `(${pr.attempts_count} essai${pr.attempts_count > 1 ? "s" : ""})`}`
                            : "Pas encore commencé"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
