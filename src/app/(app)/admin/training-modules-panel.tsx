"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Edit3 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { TrainingModule, TrainingQuestion } from "@/types/database";

type ModuleWithQuestions = TrainingModule & { training_questions: TrainingQuestion[] };

const emptyModuleForm = { order_index: "0", title: "", content: "" };
const emptyQuestionForm = { question: "", options: ["", "", "", ""], correct_option: 0 };

function sortModules(list: ModuleWithQuestions[]) {
  return [...list].sort((a, b) => a.order_index - b.order_index);
}

export function TrainingModulesPanel({ initialModules }: { initialModules: ModuleWithQuestions[] }) {
  const supabase = createClient();
  const [modules, setModules] = useState(sortModules(initialModules));
  const [openId, setOpenId] = useState<string | null>(null);

  const [showAddModule, setShowAddModule] = useState(false);
  const [moduleForm, setModuleForm] = useState(emptyModuleForm);

  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editModuleForm, setEditModuleForm] = useState(emptyModuleForm);

  const [questionFormModuleId, setQuestionFormModuleId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);

  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
  const [editQuestionForm, setEditQuestionForm] = useState(emptyQuestionForm);

  const addModule = async () => {
    if (!moduleForm.title.trim()) return;
    const { data } = await supabase
      .from("training_modules")
      .insert({
        order_index: Number(moduleForm.order_index) || 0,
        title: moduleForm.title.trim(),
        content: moduleForm.content,
      })
      .select()
      .single();
    if (data) {
      setModules((prev) => sortModules([...prev, { ...(data as TrainingModule), training_questions: [] }]));
    }
    setModuleForm(emptyModuleForm);
    setShowAddModule(false);
  };

  const startEditModule = (m: ModuleWithQuestions) => {
    setEditModuleId(m.id);
    setEditModuleForm({ order_index: String(m.order_index), title: m.title, content: m.content });
  };

  const saveModule = async (moduleId: string) => {
    const patch = {
      order_index: Number(editModuleForm.order_index) || 0,
      title: editModuleForm.title.trim(),
      content: editModuleForm.content,
    };
    setModules((prev) => sortModules(prev.map((m) => (m.id === moduleId ? { ...m, ...patch } : m))));
    setEditModuleId(null);
    await supabase.from("training_modules").update(patch).eq("id", moduleId);
  };

  const deleteModule = async (id: string) => {
    if (!confirm("Supprimer ce module et toutes ses questions ?")) return;
    setModules((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("training_modules").delete().eq("id", id);
  };

  const addQuestion = async (moduleId: string) => {
    const options = questionForm.options.map((o) => o.trim()).filter(Boolean);
    if (!questionForm.question.trim() || options.length < 2) return;
    const { data } = await supabase
      .from("training_questions")
      .insert({
        module_id: moduleId,
        question: questionForm.question.trim(),
        options,
        correct_option: Math.min(questionForm.correct_option, options.length - 1),
      })
      .select()
      .single();
    if (data) {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, training_questions: [...m.training_questions, data as TrainingQuestion] } : m
        )
      );
    }
    setQuestionForm(emptyQuestionForm);
    setQuestionFormModuleId(null);
  };

  const startEditQuestion = (q: TrainingQuestion) => {
    setEditQuestionId(q.id);
    const options = [...q.options];
    while (options.length < 4) options.push("");
    setEditQuestionForm({ question: q.question, options, correct_option: q.correct_option });
  };

  const saveQuestion = async (moduleId: string, questionId: string) => {
    const options = editQuestionForm.options.map((o) => o.trim()).filter(Boolean);
    if (!editQuestionForm.question.trim() || options.length < 2) return;
    const patch = {
      question: editQuestionForm.question.trim(),
      options,
      correct_option: Math.min(editQuestionForm.correct_option, options.length - 1),
    };
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, training_questions: m.training_questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)) }
          : m
      )
    );
    setEditQuestionId(null);
    await supabase.from("training_questions").update(patch).eq("id", questionId);
  };

  const deleteQuestion = async (moduleId: string, questionId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, training_questions: m.training_questions.filter((q) => q.id !== questionId) } : m
      )
    );
    await supabase.from("training_questions").delete().eq("id", questionId);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Formation continue — modules ({modules.length})
        </div>
        <button
          onClick={() => setShowAddModule((s) => !s)}
          className="flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1 text-xs font-bold text-night"
        >
          <Plus size={14} /> Module
        </button>
      </div>

      {showAddModule && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-card-alt p-2.5">
          <div className="grid grid-cols-4 gap-2">
            <input
              value={moduleForm.order_index}
              onChange={(e) => setModuleForm((f) => ({ ...f, order_index: e.target.value }))}
              placeholder="Ordre (0, 1, 2...)"
              className="col-span-1 rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
            <input
              value={moduleForm.title}
              onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Titre du module"
              className="col-span-3 rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
          </div>
          <textarea
            value={moduleForm.content}
            onChange={(e) => setModuleForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Contenu (markdown)"
            className="h-32 w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <button onClick={addModule} className="rounded-md bg-gold py-1.5 text-xs font-bold text-night">
            Créer le module
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {modules.map((m) => {
          const isOpen = openId === m.id;
          const isEditing = editModuleId === m.id;
          return (
            <div key={m.id} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setOpenId(isOpen ? null : m.id)}
                  className="flex flex-1 items-center justify-between text-left"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">Module {m.order_index}</div>
                    <div className="text-sm font-bold text-ink">{m.title}</div>
                    <div className="text-xs text-muted">{m.training_questions.length} question(s)</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                </button>
                <button onClick={() => deleteModule(m.id)} className="flex-shrink-0 p-1">
                  <Trash2 size={14} className="text-red" />
                </button>
              </div>

              {isOpen && (
                <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          value={editModuleForm.order_index}
                          onChange={(e) => setEditModuleForm((f) => ({ ...f, order_index: e.target.value }))}
                          className="col-span-1 rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                        />
                        <input
                          value={editModuleForm.title}
                          onChange={(e) => setEditModuleForm((f) => ({ ...f, title: e.target.value }))}
                          className="col-span-3 rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                        />
                      </div>
                      <textarea
                        value={editModuleForm.content}
                        onChange={(e) => setEditModuleForm((f) => ({ ...f, content: e.target.value }))}
                        className="h-40 w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveModule(m.id)}
                          className="flex-1 rounded-md bg-gold py-1.5 text-xs font-bold text-night"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditModuleId(null)}
                          className="rounded-md border border-line px-3 py-1.5 text-xs text-muted"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="max-h-24 flex-1 overflow-y-auto whitespace-pre-wrap text-xs text-muted">
                        {m.content || "Aucun contenu."}
                      </div>
                      <button
                        onClick={() => startEditModule(m)}
                        className="flex flex-shrink-0 items-center gap-1 text-[10px] font-bold text-gold-light"
                      >
                        <Edit3 size={11} /> Modifier
                      </button>
                    </div>
                  )}

                  <div className="border-t border-line pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Questions</div>
                      <button
                        onClick={() => {
                          setQuestionFormModuleId(questionFormModuleId === m.id ? null : m.id);
                          setQuestionForm(emptyQuestionForm);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-bold text-ink"
                      >
                        <Plus size={12} /> Question
                      </button>
                    </div>

                    {questionFormModuleId === m.id && (
                      <QuestionForm
                        form={questionForm}
                        setForm={setQuestionForm}
                        onSave={() => addQuestion(m.id)}
                        onCancel={() => setQuestionFormModuleId(null)}
                        saveLabel="Ajouter la question"
                      />
                    )}

                    <div className="flex flex-col gap-2">
                      {m.training_questions.map((q, qi) =>
                        editQuestionId === q.id ? (
                          <QuestionForm
                            key={q.id}
                            form={editQuestionForm}
                            setForm={setEditQuestionForm}
                            onSave={() => saveQuestion(m.id, q.id)}
                            onCancel={() => setEditQuestionId(null)}
                            saveLabel="Enregistrer"
                          />
                        ) : (
                          <div key={q.id} className="rounded-lg border border-line bg-card-alt p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 text-xs font-bold text-ink">
                                {qi + 1}. {q.question}
                              </div>
                              <div className="flex flex-shrink-0 gap-2">
                                <button onClick={() => startEditQuestion(q)}>
                                  <Edit3 size={12} className="text-gold-light" />
                                </button>
                                <button onClick={() => deleteQuestion(m.id, q.id)}>
                                  <Trash2 size={12} className="text-red" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-1.5 flex flex-col gap-0.5">
                              {q.options.map((opt, oi) => (
                                <div
                                  key={oi}
                                  className={`text-xs ${oi === q.correct_option ? "font-bold text-green" : "text-muted"}`}
                                >
                                  {oi === q.correct_option ? "✓ " : "— "}
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                      {m.training_questions.length === 0 && questionFormModuleId !== m.id && (
                        <div className="text-xs text-muted">Aucune question — le module sera validé d&apos;office.</div>
                      )}
                    </div>
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

function QuestionForm({
  form,
  setForm,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: typeof emptyQuestionForm;
  setForm: (fn: (f: typeof emptyQuestionForm) => typeof emptyQuestionForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div className="mb-2 flex flex-col gap-2 rounded-lg border border-line bg-card-alt p-2.5">
      <input
        value={form.question}
        onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
        placeholder="Intitulé de la question"
        className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
      />
      {form.options.map((opt, oi) => (
        <div key={oi} className="flex items-center gap-2">
          <input
            type="radio"
            checked={form.correct_option === oi}
            onChange={() => setForm((f) => ({ ...f, correct_option: oi }))}
            title="Bonne réponse"
          />
          <input
            value={opt}
            onChange={(e) =>
              setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === oi ? e.target.value : o)) }))
            }
            placeholder={`Option ${oi + 1}`}
            className="flex-1 rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={onSave} className="flex-1 rounded-md bg-gold py-1.5 text-xs font-bold text-night">
          {saveLabel}
        </button>
        <button onClick={onCancel} className="rounded-md border border-line px-3 py-1.5 text-xs text-muted">
          Annuler
        </button>
      </div>
    </div>
  );
}
