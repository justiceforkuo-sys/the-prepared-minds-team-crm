"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, CalendarPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";
import { googleCalendarUrl } from "@/lib/calendar";
import type { Task } from "@/types/database";

type TaskRow = Task & { assignee: { name: string } | null; assigner: { name: string } | null };

const emptyForm = { title: "", assignedTo: "", dueDate: "", notes: "" };

export function AgendaBoard({
  me,
  initialTasks,
  people,
}: {
  me: { id: string; name: string };
  initialTasks: TaskRow[];
  people: { id: string; name: string }[];
}) {
  const supabase = createClient();
  const [tasks, setTasks] = useState(initialTasks);
  const [tab, setTab] = useState<"a-moi" | "donnees">("a-moi");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, assignedTo: me.id });

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(
    () => tasks.filter((t) => (tab === "a-moi" ? t.assigned_to === me.id : t.assigned_by === me.id && t.assigned_to !== me.id)),
    [tasks, tab, me.id]
  );

  const add = async () => {
    if (!form.title.trim() || !form.assignedTo) return;
    const { data } = await supabase
      .from("tasks")
      .insert({
        assigned_by: me.id,
        assigned_to: form.assignedTo,
        title: form.title.trim(),
        due_date: form.dueDate || null,
        notes: form.notes.trim() || null,
      })
      .select("*, assignee:people!tasks_assigned_to_fkey(name), assigner:people!tasks_assigned_by_fkey(name)")
      .single();
    if (data) setTasks((prev) => [data as TaskRow, ...prev]);
    setForm({ ...emptyForm, assignedTo: me.id });
    setShowForm(false);
  };

  const toggle = async (t: TaskRow) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
  };

  const remove = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink">Agenda</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night"
        >
          <Plus size={16} /> Nouvelle tâche
        </button>
      </div>
      <p className="mb-4 mt-1 text-xs text-muted">
        Donne une tâche à n&apos;importe qui dans l&apos;équipe, ou suis celles qu&apos;on t&apos;a données.
      </p>

      {showForm && (
        <div className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-3.5">
          <div>
            <label className="mb-1 block text-xs text-muted">Titre</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex : Relancer le client X pour signature"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Assignée à</label>
            <select
              value={form.assignedTo}
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === me.id ? `${p.name} (moi)` : p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Échéance</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="h-16 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <button
            disabled={!form.title.trim()}
            onClick={add}
            className="mt-1 rounded-lg bg-gold py-2 text-sm font-bold text-night disabled:opacity-50"
          >
            Assigner
          </button>
        </div>
      )}

      <div className="mb-3.5 flex gap-2">
        <button
          onClick={() => setTab("a-moi")}
          className={`flex-1 rounded-full border px-3 py-1.5 text-xs ${
            tab === "a-moi" ? "border-gold bg-line text-gold-light" : "border-line bg-card text-muted"
          }`}
        >
          Assignées à moi
        </button>
        <button
          onClick={() => setTab("donnees")}
          className={`flex-1 rounded-full border px-3 py-1.5 text-xs ${
            tab === "donnees" ? "border-gold bg-line text-gold-light" : "border-line bg-card text-muted"
          }`}
        >
          Que j&apos;ai données
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          {tab === "a-moi" ? "Aucune tâche assignée pour l'instant." : "Tu n'as encore donné aucune tâche."}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((t) => {
          const late = !t.done && t.due_date !== null && t.due_date < today;
          return (
            <div key={t.id} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex items-start gap-2.5">
                <button onClick={() => toggle(t)} className="mt-0.5 flex-shrink-0">
                  {t.done ? (
                    <CheckCircle2 size={20} className="text-green" />
                  ) : (
                    <Circle size={20} className="text-[#c3cddc]" />
                  )}
                </button>
                <div className="flex-1">
                  <div className={`text-sm font-bold ${t.done ? "text-muted line-through" : "text-ink"}`}>
                    {t.title}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {tab === "a-moi" ? `Donnée par ${t.assigner?.name ?? "?"}` : `Assignée à ${t.assignee?.name ?? "?"}`}
                  </div>
                  {t.notes && <div className="mt-1 text-xs text-ink">{t.notes}</div>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {t.due_date && (
                    <div className={`text-xs font-bold ${late ? "text-red" : "text-gold-light"}`}>
                      {fmtDate(t.due_date)}
                    </div>
                  )}
                  {t.due_date && (
                    <a
                      href={googleCalendarUrl(t.title, t.notes ?? "", t.due_date)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ajouter à Google Calendar"
                      className="text-muted"
                    >
                      <CalendarPlus size={16} />
                    </a>
                  )}
                  {t.assigned_by === me.id && (
                    <button onClick={() => remove(t.id)}>
                      <Trash2 size={14} className="text-red" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
