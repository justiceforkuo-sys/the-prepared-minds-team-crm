"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { TrainingModule, TrainingProgress, TrainingQuizQuestion } from "@/types/database";

export function ModuleView({
  trainingModule,
  questions,
  initialProgress,
  nextModuleId,
}: {
  trainingModule: TrainingModule;
  questions: TrainingQuizQuestion[];
  initialProgress: TrainingProgress | null;
  nextModuleId: string | null;
}) {
  const supabase = createClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(
    initialProgress?.passed ? { score: initialProgress.best_score ?? 0, passed: true } : null
  );

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  const submit = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_training_quiz", {
      p_module_id: trainingModule.id,
      p_answers: answers,
    });
    setSubmitting(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setResult({ score: row.score, passed: row.passed });
  };

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">{trainingModule.title}</h2>

      <div className="prose prose-sm mt-4 max-w-none rounded-2xl border border-line bg-card p-3.5 text-sm text-ink">
        <ReactMarkdown>{trainingModule.content}</ReactMarkdown>
      </div>

      {questions.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            Quiz de validation (80% requis)
          </div>

          <div className="flex flex-col gap-3">
            {questions.map((q, qi) => (
              <div key={q.id} className="rounded-2xl border border-line bg-card p-3.5">
                <div className="mb-2 text-sm font-bold text-ink">
                  {qi + 1}. {q.question}
                </div>
                <div className="flex flex-col gap-1.5">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === oi}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && (
        <button
          onClick={submit}
          disabled={(questions.length > 0 && !allAnswered) || submitting}
          className="mt-3 w-full rounded-lg bg-gold py-2.5 text-sm font-bold text-night disabled:opacity-50"
        >
          {submitting
            ? "..."
            : questions.length > 0
              ? "Valider mes réponses"
              : "Marquer ce module comme terminé"}
        </button>
      )}

      {result && (
        <div
          className={`mt-3 flex items-center gap-2.5 rounded-2xl border p-3.5 ${
            result.passed ? "border-green bg-card" : "border-red bg-card"
          }`}
        >
          {result.passed ? (
            <CheckCircle2 size={22} className="flex-shrink-0 text-green" />
          ) : (
            <XCircle size={22} className="flex-shrink-0 text-red" />
          )}
          <div className="flex-1">
            {questions.length > 0 && <div className="text-sm font-bold text-ink">Score : {result.score}%</div>}
            <div className="text-xs text-muted">
              {result.passed ? "Module validé !" : "En dessous de 80% — retente quand tu veux."}
            </div>
          </div>
          {!result.passed && (
            <button
              onClick={() => setResult(null)}
              className="flex-shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink"
            >
              Retenter
            </button>
          )}
          {result.passed && nextModuleId && (
            <Link
              href={`/formation-continue/${nextModuleId}`}
              className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night"
            >
              Module suivant <ArrowRight size={13} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
