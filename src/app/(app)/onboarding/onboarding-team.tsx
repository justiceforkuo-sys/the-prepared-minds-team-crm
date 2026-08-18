"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import type { OnboardingProgress, Person } from "@/types/database";

interface RecruitProgress {
  person: Pick<Person, "id" | "name" | "rank">;
  progress: OnboardingProgress[];
}

export function OnboardingTeam({ recruits }: { recruits: RecruitProgress[] }) {
  const supabase = createClient();
  const [data, setData] = useState(recruits);
  const [openId, setOpenId] = useState<string | null>(null);

  const record = (personId: string, stepId: string) =>
    data.find((r) => r.person.id === personId)?.progress.find((p) => p.step_id === stepId);

  const validate = async (personId: string, stepId: string, doneBySelf: boolean) => {
    if (!doneBySelf) return;
    const existing = record(personId, stepId);
    const nextValidated = !existing?.validated_by_sponsor;
    const { data: row } = await supabase
      .from("onboarding_progress")
      .upsert(
        {
          person_id: personId,
          step_id: stepId,
          done_by_self: true,
          done_date: existing?.done_date ?? null,
          validated_by_sponsor: nextValidated,
          validated_date: nextValidated ? new Date().toISOString().slice(0, 10) : null,
        },
        { onConflict: "person_id,step_id" }
      )
      .select()
      .single();
    if (row) {
      setData((prev) =>
        prev.map((r) =>
          r.person.id === personId
            ? { ...r, progress: [...r.progress.filter((p) => p.step_id !== stepId), row as OnboardingProgress] }
            : r
        )
      );
    }
  };

  if (data.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Onboarding de mon équipe</div>
      <div className="flex flex-col gap-2">
        {data.map((r) => {
          const doneCount = r.progress.filter((p) => p.done_by_self).length;
          const validatedCount = r.progress.filter((p) => p.validated_by_sponsor).length;
          const open = openId === r.person.id;
          return (
            <div key={r.person.id} className="rounded-2xl border border-line bg-card p-3.5">
              <button
                onClick={() => setOpenId(open ? null : r.person.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <div className="text-sm font-bold text-ink">{r.person.name}</div>
                  <div className="text-xs text-muted">
                    {doneCount}/{ONBOARDING_STEPS.length} faites — {validatedCount} validées
                  </div>
                </div>
                <span className="text-xs text-gold-light">{open ? "Fermer" : "Détails"}</span>
              </button>
              {open && (
                <div className="mt-3 flex flex-col gap-2">
                  {ONBOARDING_STEPS.map((step) => {
                    const rec = record(r.person.id, step.id);
                    const doneBySelf = !!rec?.done_by_self;
                    return (
                      <button
                        key={step.id}
                        onClick={() => validate(r.person.id, step.id, doneBySelf)}
                        disabled={!doneBySelf}
                        className="flex items-center gap-2.5 rounded-lg border border-line bg-card-alt p-2.5 text-left disabled:opacity-50"
                      >
                        {doneBySelf ? (
                          <CheckCircle2 size={16} className="text-green" />
                        ) : (
                          <Circle size={16} className="text-[#c3cddc]" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm text-ink">{step.label}</div>
                          <div className="text-[10px] text-muted">
                            {doneBySelf ? "Fait par la recrue" : "Pas encore fait"}
                          </div>
                        </div>
                        {rec?.validated_by_sponsor ? (
                          <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-night">
                            Validé
                          </span>
                        ) : doneBySelf ? (
                          <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] text-gold-light">
                            À valider
                          </span>
                        ) : null}
                      </button>
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
