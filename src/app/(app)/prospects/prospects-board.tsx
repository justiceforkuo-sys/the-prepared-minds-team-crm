"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit3, Plus, Trash2, X, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";
import type { Priority, Prospect, ProspectStage } from "@/types/database";

const STAGES: ProspectStage[] = ["Contact", "Invité", "Présentation faite", "Suivi", "Partenaire", "Perdu"];
const STAGE_COLOR: Record<ProspectStage, string> = {
  Contact: "#5a6b85",
  Invité: "#1e3a6d",
  "Présentation faite": "#2f5fa8",
  Suivi: "#3f7d5c",
  Partenaire: "#3f7d5c",
  Perdu: "#b3543a",
};
const PRIORITIES: Priority[] = ["A", "B", "C"];
const PRIORITY_COLOR: Record<Priority, string> = { A: "#1e3a6d", B: "#5a6b85", C: "#8a97ab" };
const PRIORITY_LABEL: Record<Priority, string> = { A: "A — Prioritaire", B: "B — Normal", C: "C — À nourrir" };

type FormValues = {
  name: string;
  phone: string;
  source: string;
  notes: string;
  next_follow_up: string;
  priority: Priority;
};

const emptyForm: FormValues = { name: "", phone: "", source: "", notes: "", next_follow_up: "", priority: "B" };

export function ProspectsBoard({ ownerId }: { ownerId: string }) {
  const supabase = createClient();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<ProspectStage | "Tous">("Tous");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "Tous">("Tous");

  const [showQuick, setShowQuick] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);

  useEffect(() => {
    supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProspects((data as Prospect[]) ?? []);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDuplicate = (name: string, excludeId?: string) =>
    name.trim() &&
    prospects.some((p) => p.id !== excludeId && p.name.trim().toLowerCase() === name.trim().toLowerCase());

  const quickAdd = async () => {
    if (!quickName.trim()) return;
    const { data } = await supabase
      .from("prospects")
      .insert({ owner_id: ownerId, name: quickName.trim(), phone: quickPhone.trim() || null })
      .select()
      .single();
    if (data) setProspects((prev) => [data as Prospect, ...prev]);
    setQuickName("");
    setQuickPhone("");
    setShowQuick(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };
  const openEdit = (p: Prospect) => {
    setEditing(p);
    setForm({
      name: p.name,
      phone: p.phone ?? "",
      source: p.source ?? "",
      notes: p.notes ?? "",
      next_follow_up: p.next_follow_up ?? "",
      priority: p.priority,
    });
    setShowForm(true);
  };

  const saveForm = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      source: form.source || null,
      notes: form.notes || null,
      next_follow_up: form.next_follow_up || null,
      priority: form.priority,
    };
    if (editing) {
      const { data } = await supabase.from("prospects").update(payload).eq("id", editing.id).select().single();
      if (data) setProspects((prev) => prev.map((p) => (p.id === editing.id ? (data as Prospect) : p)));
    } else {
      const { data } = await supabase
        .from("prospects")
        .insert({ owner_id: ownerId, ...payload })
        .select()
        .single();
      if (data) setProspects((prev) => [data as Prospect, ...prev]);
    }
    setShowForm(false);
    setEditing(null);
  };

  const deleteProspect = async (id: string) => {
    await supabase.from("prospects").delete().eq("id", id);
    setProspects((prev) => prev.filter((p) => p.id !== id));
  };

  const setStage = async (id: string, stage: ProspectStage) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, stage } : p)));
    await supabase.from("prospects").update({ stage }).eq("id", id);
  };

  const filtered = useMemo(() => {
    let list = prospects;
    if (stageFilter !== "Tous") list = list.filter((p) => p.stage === stageFilter);
    if (priorityFilter !== "Tous") list = list.filter((p) => p.priority === priorityFilter);
    const rank: Record<Priority, number> = { A: 0, B: 1, C: 2 };
    return [...list].sort((a, b) => rank[a.priority] - rank[b.priority]);
  }, [prospects, stageFilter, priorityFilter]);

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink">Prospects</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuick((s) => !s)}
            className="flex items-center gap-1 rounded-full border border-gold px-3 py-1.5 text-xs text-gold-light"
          >
            <Zap size={13} /> Rapide
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      {showQuick && (
        <div className="mb-3 rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            Ajout rapide — nom et téléphone
          </div>
          <div className="flex gap-2">
            <input
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Nom"
              className="flex-1 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            <input
              value={quickPhone}
              onChange={(e) => setQuickPhone(e.target.value)}
              placeholder="Téléphone"
              className="flex-1 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          {isDuplicate(quickName) && (
            <div className="mt-2 flex gap-1.5 text-xs text-gold">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              <span>Un prospect nommé « {quickName.trim()} » existe déjà.</span>
            </div>
          )}
          <button
            disabled={!quickName.trim()}
            onClick={quickAdd}
            className="mt-2.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night disabled:opacity-50"
          >
            {isDuplicate(quickName) ? "Ajouter quand même" : "Ajouter"}
          </button>
        </div>
      )}

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-2">
        {(["Tous", ...STAGES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              stageFilter === s ? "border-gold bg-line text-gold-light" : "border-line bg-card text-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-2">
        {(["Tous", ...PRIORITIES] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              priorityFilter === p ? "border-gold bg-line text-gold-light" : "border-line bg-card text-muted"
            }`}
          >
            {p === "Tous" ? "Toutes priorités" : p}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-muted">Chargement...</div>}
      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucun prospect ici. Ajoute ton prochain contact — c&apos;est le début de tout.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-line bg-card p-3.5"
            style={{ borderLeft: `3px solid ${PRIORITY_COLOR[p.priority]}` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[11px] font-extrabold text-night"
                  style={{ background: PRIORITY_COLOR[p.priority] }}
                >
                  {p.priority}
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">{p.name}</div>
                  {p.phone && <div className="text-xs text-muted">{p.phone}</div>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="p-1">
                  <Edit3 size={14} className="text-muted" />
                </button>
                <button onClick={() => deleteProspect(p.id)} className="p-1">
                  <Trash2 size={14} className="text-red" />
                </button>
              </div>
            </div>
            {p.notes && <div className="mt-1.5 text-xs text-muted">{p.notes}</div>}
            <div className="mt-2.5 flex items-center justify-between">
              <select
                value={p.stage}
                onChange={(e) => setStage(p.id, e.target.value as ProspectStage)}
                className="rounded-md border border-line bg-card-alt px-2 py-1 text-xs font-bold"
                style={{ color: STAGE_COLOR[p.stage] }}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {p.next_follow_up && <div className="text-xs text-muted">Suivi : {fmtDate(p.next_follow_up)}</div>}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 md:rounded-2xl">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-ink">
                {editing ? "Modifier" : "Nouveau prospect"}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X size={18} className="text-muted" />
              </button>
            </div>

            <label className="mb-1 block text-xs text-muted">Priorité</label>
            <div className="mb-2.5 flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className="flex-1 rounded-full border px-2 py-1.5 text-center text-xs"
                  style={
                    form.priority === p
                      ? { borderColor: PRIORITY_COLOR[p], color: PRIORITY_COLOR[p], background: "#eaf0fa" }
                      : { borderColor: "#d7e0ec", color: "#5a6b85" }
                  }
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs text-muted">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Prénom Nom"
              className="mb-1 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            {isDuplicate(form.name, editing?.id) && (
              <div className="mb-2 flex gap-1.5 text-xs text-gold">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                <span>Un prospect nommé « {form.name.trim()} » existe déjà dans ta liste.</span>
              </div>
            )}

            <label className="mb-1 mt-2 block text-xs text-muted">Téléphone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+32 4xx xx xx xx"
              className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />

            <label className="mb-1 block text-xs text-muted">Source</label>
            <input
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="Recommandation, réseau, événement..."
              className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />

            <label className="mb-1 block text-xs text-muted">Prochain suivi</label>
            <input
              type="date"
              value={form.next_follow_up}
              onChange={(e) => setForm((f) => ({ ...f, next_follow_up: e.target.value }))}
              className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />

            <label className="mb-1 block text-xs text-muted">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Contexte, besoins, objections..."
              className="mb-2.5 h-20 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />

            <button
              disabled={!form.name.trim()}
              onClick={saveForm}
              className="mt-1 w-full rounded-lg bg-gold py-2.5 text-sm font-bold text-night disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
