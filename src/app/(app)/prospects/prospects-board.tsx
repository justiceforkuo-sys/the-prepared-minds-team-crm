"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit3, Plus, Trash2, X, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";
import { SprintPanel } from "./sprint-panel";
import type {
  ConnectionStatus,
  ExistingContactMatch,
  Priority,
  Prospect,
  ProspectCategory,
  ProspectStage,
} from "@/types/database";

const STAGES: ProspectStage[] = ["Contacté", "Répondu", "RDV pris", "Entretien / Dossier", "Perdu"];
const PRESCRIPTEUR_STAGES: ProspectStage[] = [
  "Contacté",
  "Répondu",
  "Échange qualifié",
  "Mise en relation obtenue",
  "Nouveau lead client généré",
  "Sans suite",
];
// Dégradé navy → or à mesure qu'un prospect avance dans le cycle, vert pour
// l'état positif terminal, rouge pour Perdu — palette de marque (logo PMT).
// "var(--color-gold-light)" plutôt qu'un navy figé : cette couleur sert de
// texte (select de statut) sur un fond de carte qui devient sombre en mode
// nuit — un navy fixe y serait illisible, le token s'adapte automatiquement.
const STAGE_COLOR: Record<ProspectStage, string> = {
  Contact: "#5a6b85",
  Invité: "var(--color-gold-light)",
  "Présentation faite": "var(--color-gold-light)",
  Suivi: "#1f8158",
  Partenaire: "#1f8158",
  Perdu: "#b3543a",
  Contacté: "#5a6b85",
  Répondu: "var(--color-gold-light)",
  "RDV pris": "#f5cd54",
  "Entretien / Dossier": "#1f8158",
  "Échange qualifié": "var(--color-gold-light)",
  "Mise en relation obtenue": "#f5cd54",
  "Nouveau lead client généré": "#1f8158",
  "Sans suite": "#b3543a",
};
const stagesFor = (category: ProspectCategory) => (category === "prescripteur" ? PRESCRIPTEUR_STAGES : STAGES);

const PRIORITIES: Priority[] = ["A", "B", "C"];
const PRIORITY_COLOR: Record<Priority, string> = { A: "#1e3a6d", B: "#5a6b85", C: "#8a97ab" };
const PRIORITY_LABEL: Record<Priority, string> = { A: "A — Prioritaire", B: "B — Normal", C: "C — À nourrir" };
const CATEGORIES: ProspectCategory[] = ["client", "recrutement", "prescripteur"];
const CATEGORY_LABEL: Record<ProspectCategory, string> = {
  client: "Client",
  recrutement: "Recrutement",
  prescripteur: "Prescripteur",
};
const CATEGORY_COLOR: Record<ProspectCategory, string> = {
  client: "#172047",
  recrutement: "#1f8158",
  prescripteur: "#b8923f",
};
const CONNECTION_STATUSES: ConnectionStatus[] = ["En attente", "Oui", "Non"];

type FormValues = {
  name: string;
  phone: string;
  source: string;
  notes: string;
  next_follow_up: string;
  priority: Priority;
  category: ProspectCategory;
  network_contact_name: string;
  connection_status: ConnectionStatus | "";
};

const emptyForm: FormValues = {
  name: "",
  phone: "",
  source: "",
  notes: "",
  next_follow_up: "",
  priority: "B",
  category: "client",
  network_contact_name: "",
  connection_status: "",
};

export function ProspectsBoard({ ownerId }: { ownerId: string }) {
  const supabase = createClient();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<ProspectStage | "Tous">("Tous");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "Tous">("Tous");
  const [categoryFilter, setCategoryFilter] = useState<ProspectCategory | "Tous">("Tous");

  const [showQuick, setShowQuick] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickCategory, setQuickCategory] = useState<ProspectCategory>("client");
  const [quickCrossMatch, setQuickCrossMatch] = useState<ExistingContactMatch[] | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [formCrossMatch, setFormCrossMatch] = useState<ExistingContactMatch[] | null>(null);

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

  const checkCross = async (name: string, setResult: (m: ExistingContactMatch[] | null) => void) => {
    if (!name.trim()) {
      setResult(null);
      return;
    }
    const { data } = await supabase.rpc("check_existing_contact", { p_name: name.trim() });
    setResult((data as ExistingContactMatch[]) ?? []);
  };

  const quickAdd = async () => {
    if (!quickName.trim()) return;
    const { data } = await supabase
      .from("prospects")
      .insert({
        owner_id: ownerId,
        name: quickName.trim(),
        phone: quickPhone.trim() || null,
        category: quickCategory,
      })
      .select()
      .single();
    if (data) setProspects((prev) => [data as Prospect, ...prev]);
    setQuickName("");
    setQuickPhone("");
    setQuickCategory("client");
    setQuickCrossMatch(null);
    setShowQuick(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormCrossMatch(null);
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
      category: p.category,
      network_contact_name: p.network_contact_name ?? "",
      connection_status: p.connection_status ?? "",
    });
    setFormCrossMatch(null);
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
      category: form.category,
      network_contact_name: form.category === "prescripteur" ? form.network_contact_name.trim() || null : null,
      connection_status: form.category === "prescripteur" ? form.connection_status || null : null,
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

  const convertToClient = async (p: Prospect) => {
    const clientName = p.network_contact_name?.trim() || p.name;
    const { data: client } = await supabase
      .from("clients")
      .insert({ owner_id: ownerId, name: clientName })
      .select("id")
      .single();
    if (!client) return;
    setProspects((prev) => prev.map((x) => (x.id === p.id ? { ...x, redirected_client_id: client.id } : x)));
    await supabase.from("prospects").update({ redirected_client_id: client.id }).eq("id", p.id);
  };

  const filtered = useMemo(() => {
    let list = prospects;
    if (stageFilter !== "Tous") list = list.filter((p) => p.stage === stageFilter);
    if (priorityFilter !== "Tous") list = list.filter((p) => p.priority === priorityFilter);
    if (categoryFilter !== "Tous") list = list.filter((p) => p.category === categoryFilter);
    const rank: Record<Priority, number> = { A: 0, B: 1, C: 2 };
    return [...list].sort((a, b) => rank[a.priority] - rank[b.priority]);
  }, [prospects, stageFilter, priorityFilter, categoryFilter]);

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

      <SprintPanel ownerId={ownerId} prospects={prospects} />

      {showQuick && (
        <div className="mb-3 rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            Ajout rapide — nom et téléphone
          </div>
          <div className="flex gap-2">
            <input
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              onBlur={(e) => checkCross(e.target.value, setQuickCrossMatch)}
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
          <div className="mt-2 flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setQuickCategory(c)}
                className="flex-1 rounded-full border px-2 py-1.5 text-center text-xs"
                style={
                  quickCategory === c
                    ? { borderColor: CATEGORY_COLOR[c], color: CATEGORY_COLOR[c], background: "#eaf0fa" }
                    : { borderColor: "#d7e0ec", color: "#5a6b85" }
                }
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          {isDuplicate(quickName) && (
            <div className="mt-2 flex gap-1.5 text-xs text-gold">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              <span>Un prospect nommé « {quickName.trim()} » existe déjà.</span>
            </div>
          )}
          {quickCrossMatch?.map((m, i) => (
            <div key={i} className="mt-2 flex gap-1.5 text-xs text-gold">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                Déjà {m.source === "client" ? "client" : "prospecté(e)"} chez{" "}
                <b>{m.collaborateur}</b> depuis le {fmtDate(m.since)}.
              </span>
            </div>
          ))}
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
        {(["Tous", ...(categoryFilter === "prescripteur" ? PRESCRIPTEUR_STAGES : STAGES)] as const).map((s) => (
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
      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-2">
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
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-2">
        {(["Tous", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              categoryFilter === c ? "border-gold bg-line text-gold-light" : "border-line bg-card text-muted"
            }`}
          >
            {c === "Tous" ? "Toutes catégories" : CATEGORY_LABEL[c]}
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
            style={{ borderLeft: `4px solid ${STAGE_COLOR[p.stage]}` }}
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-ink">{p.name}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-night"
                      style={{ background: CATEGORY_COLOR[p.category] }}
                    >
                      {CATEGORY_LABEL[p.category]}
                    </span>
                  </div>
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
            {p.category === "prescripteur" && (p.network_contact_name || p.connection_status) && (
              <div className="mt-1.5 text-xs text-muted">
                {p.network_contact_name && (
                  <div>
                    Réseau identifié : <span className="text-ink">{p.network_contact_name}</span>
                  </div>
                )}
                {p.connection_status && <div>Mise en relation : {p.connection_status}</div>}
              </div>
            )}
            <div className="mt-2.5 flex items-center justify-between">
              <select
                value={p.stage}
                onChange={(e) => setStage(p.id, e.target.value as ProspectStage)}
                className="rounded-md border border-line bg-card-alt px-2 py-1 text-xs font-bold"
                style={{ color: STAGE_COLOR[p.stage] }}
              >
                {stagesFor(p.category).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {p.next_follow_up && <div className="text-xs text-muted">Suivi : {fmtDate(p.next_follow_up)}</div>}
            </div>
            {p.category === "prescripteur" && p.stage === "Nouveau lead client généré" && (
              <div className="mt-2 border-t border-line pt-2">
                {p.redirected_client_id ? (
                  <div className="text-xs font-bold text-gold-light">
                    → Fiche client créée : {p.network_contact_name || p.name}
                  </div>
                ) : (
                  <button
                    onClick={() => convertToClient(p)}
                    className="w-full rounded-md bg-gold py-1.5 text-xs font-bold text-night"
                  >
                    Créer la fiche client
                  </button>
                )}
              </div>
            )}
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

            <label className="mb-1 block text-xs text-muted">Catégorie</label>
            <div className="mb-2.5 flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, category: c }))}
                  className="flex-1 rounded-full border px-2 py-1.5 text-center text-xs"
                  style={
                    form.category === c
                      ? { borderColor: CATEGORY_COLOR[c], color: CATEGORY_COLOR[c], background: "#eaf0fa" }
                      : { borderColor: "#d7e0ec", color: "#5a6b85" }
                  }
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>

            {form.category === "prescripteur" && (
              <>
                <label className="mb-1 block text-xs text-muted">Membre du réseau identifié</label>
                <input
                  value={form.network_contact_name}
                  onChange={(e) => setForm((f) => ({ ...f, network_contact_name: e.target.value }))}
                  placeholder="Nom / poste de la personne mentionnée"
                  className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />

                <label className="mb-1 block text-xs text-muted">Mise en relation faite ?</label>
                <div className="mb-2.5 flex gap-2">
                  {CONNECTION_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm((f) => ({ ...f, connection_status: s }))}
                      className="flex-1 rounded-full border px-2 py-1.5 text-center text-xs"
                      style={
                        form.connection_status === s
                          ? { borderColor: CATEGORY_COLOR.prescripteur, color: CATEGORY_COLOR.prescripteur, background: "#eaf0fa" }
                          : { borderColor: "#d7e0ec", color: "#5a6b85" }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className="mb-1 block text-xs text-muted">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={(e) => checkCross(e.target.value, setFormCrossMatch)}
              placeholder="Prénom Nom"
              className="mb-1 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            {isDuplicate(form.name, editing?.id) && (
              <div className="mb-2 flex gap-1.5 text-xs text-gold">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                <span>Un prospect nommé « {form.name.trim()} » existe déjà dans ta liste.</span>
              </div>
            )}
            {formCrossMatch?.map((m, i) => (
              <div key={i} className="mb-2 flex gap-1.5 text-xs text-gold">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                <span>
                  Déjà {m.source === "client" ? "client" : "prospecté(e)"} chez{" "}
                  <b>{m.collaborateur}</b> depuis le {fmtDate(m.since)}.
                </span>
              </div>
            ))}

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
