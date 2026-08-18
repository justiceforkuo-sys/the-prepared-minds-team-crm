"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Goal, GoalStep } from "@/types/database";

export function ObjectifsList({ personId, initialGoals }: { personId: string; initialGoals: Goal[] }) {
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [text, setText] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [stepText, setStepText] = useState("");

  const add = async () => {
    if (!text.trim()) return;
    const { data } = await supabase
      .from("goals")
      .insert({ person_id: personId, text: text.trim() })
      .select()
      .single();
    if (data) setGoals((prev) => [data as Goal, ...prev]);
    setText("");
  };

  const toggle = async (g: Goal) => {
    setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)));
    await supabase.from("goals").update({ done: !g.done }).eq("id", g.id);
  };

  const remove = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("goals").delete().eq("id", id);
  };

  const saveSteps = async (goalId: string, steps: GoalStep[]) => {
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, steps } : g)));
    await supabase.from("goals").update({ steps }).eq("id", goalId);
  };

  const addStep = (g: Goal) => {
    if (!stepText.trim()) return;
    const step: GoalStep = { id: crypto.randomUUID(), text: stepText.trim(), done: false };
    saveSteps(g.id, [...g.steps, step]);
    setStepText("");
  };

  const toggleStep = (g: Goal, stepId: string) => {
    saveSteps(
      g.id,
      g.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s))
    );
  };

  const removeStep = (g: Goal, stepId: string) => {
    saveSteps(
      g.id,
      g.steps.filter((s) => s.id !== stepId)
    );
  };

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Objectifs</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        « Fixe la cible, écris-la, revois-la chaque jour. » — Jim Rohn
      </p>

      <div className="mb-3.5 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Ex : Recruter 2 FA ce trimestre"
          className="flex-1 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
        />
        <button onClick={add} className="rounded-lg bg-gold px-3 py-2 text-sm font-bold text-night">
          <Plus size={16} />
        </button>
      </div>

      {goals.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Pas encore d&apos;objectif écrit.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {goals.map((g) => {
          const open = openId === g.id;
          const stepsDone = g.steps.filter((s) => s.done).length;
          return (
            <div key={g.id} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex items-center gap-2.5">
                <button onClick={() => toggle(g)}>
                  {g.done ? (
                    <CheckCircle2 size={20} className="text-green" />
                  ) : (
                    <Circle size={20} className="text-[#c3cddc]" />
                  )}
                </button>
                <div className={`flex-1 text-sm ${g.done ? "text-muted line-through" : "text-ink"}`}>
                  {g.text}
                  {g.steps.length > 0 && (
                    <span className="ml-2 text-xs text-muted">
                      ({stepsDone}/{g.steps.length})
                    </span>
                  )}
                </div>
                <button onClick={() => setOpenId(open ? null : g.id)} className="p-1 text-muted">
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button onClick={() => remove(g.id)}>
                  <Trash2 size={14} className="text-red" />
                </button>
              </div>

              {open && (
                <div className="ml-7 mt-2.5 flex flex-col gap-1.5 border-l border-line pl-3">
                  {g.steps.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <button onClick={() => toggleStep(g, s.id)}>
                        {s.done ? (
                          <CheckCircle2 size={15} className="text-green" />
                        ) : (
                          <Circle size={15} className="text-[#c3cddc]" />
                        )}
                      </button>
                      <span className={`flex-1 text-xs ${s.done ? "text-muted line-through" : "text-ink"}`}>
                        {s.text}
                      </span>
                      <button onClick={() => removeStep(g, s.id)}>
                        <Trash2 size={12} className="text-red" />
                      </button>
                    </div>
                  ))}
                  <div className="mt-1 flex gap-1.5">
                    <input
                      value={stepText}
                      onChange={(e) => setStepText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addStep(g)}
                      placeholder="Ajouter une étape"
                      className="flex-1 rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold"
                    />
                    <button
                      onClick={() => addStep(g)}
                      className="rounded-md bg-gold px-2 py-1 text-xs font-bold text-night"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
