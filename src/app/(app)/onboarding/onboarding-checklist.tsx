"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import type { OnboardingProgress } from "@/types/database";

export function OnboardingChecklist({
  personId,
  initialProgress,
}: {
  personId: string;
  initialProgress: OnboardingProgress[];
}) {
  const supabase = createClient();
  const [progress, setProgress] = useState<OnboardingProgress[]>(initialProgress);

  const record = (stepId: string) => progress.find((p) => p.step_id === stepId);
  const doneCount = progress.filter((p) => p.done_by_self).length;

  const toggle = async (stepId: string) => {
    const existing = record(stepId);
    const nextDone = !existing?.done_by_self;
    const { data } = await supabase
      .from("onboarding_progress")
      .upsert(
        {
          person_id: personId,
          step_id: stepId,
          done_by_self: nextDone,
          done_date: nextDone ? new Date().toISOString().slice(0, 10) : null,
        },
        { onConflict: "person_id,step_id" }
      )
      .select()
      .single();
    if (data) {
      setProgress((prev) => {
        const rest = prev.filter((p) => p.step_id !== stepId);
        return [...rest, data as OnboardingProgress];
      });
    }
  };

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Onboarding</h2>
      <p className="mb-4 mt-1 text-xs text-muted">Le Fast Start — coche chaque étape au fur et à mesure.</p>

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Mon parcours</div>
          <div className="text-xs text-muted">
            {doneCount}/{ONBOARDING_STEPS.length} faites
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {ONBOARDING_STEPS.map((step) => {
            const rec = record(step.id);
            return (
              <button
                key={step.id}
                onClick={() => toggle(step.id)}
                className="flex items-center gap-2.5 rounded-lg border border-line bg-card-alt p-2.5 text-left"
              >
                {rec?.done_by_self ? (
                  <CheckCircle2 size={18} className="text-green" />
                ) : (
                  <Circle size={18} className="text-[#c3cddc]" />
                )}
                <div>
                  <div className="text-sm text-ink">{step.label}</div>
                  <div className="text-[10px] text-muted">{step.timeframe}</div>
                </div>
                {rec?.validated_by_sponsor && (
                  <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-night">
                    Validé
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
