"use client";

import { useState } from "react";
import { Edit3, Plus, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { RANKS_INFO, nextRank } from "@/lib/ranks";
import type { Person, Rank } from "@/types/database";

interface PendingRequest {
  id: string;
  target_id: string;
  requested_by: string;
  created_at: string;
  target: { name: string } | null;
  requester: { name: string } | null;
}

export function EquipeBoard({
  me,
  downline: initialDownline,
  pendingRequests: initialPending,
}: {
  me: Person;
  downline: Person[];
  pendingRequests: PendingRequest[];
}) {
  const supabase = createClient();
  const [downline, setDownline] = useState(initialDownline);
  const [pending, setPending] = useState(initialPending);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rank, setRank] = useState<Rank>("JFAI");

  const [editing, setEditing] = useState<Person | null>(null);
  const [editForm, setEditForm] = useState({ rank: "JFAI" as Rank, personal_pts: 0, team_quarterly_pts: 0, notes: "" });

  const myInfo = RANKS_INFO.find((r) => r.code === me.rank);
  const myNext = nextRank(me.rank);

  const addCollaborator = async () => {
    if (!name.trim()) return;
    const { data } = await supabase
      .from("people")
      .insert({ name: name.trim(), rank, email: email.trim() || null, reports_to: me.id })
      .select()
      .single();
    if (data) setDownline((prev) => [...prev, data as Person].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setEmail("");
    setRank("JFAI");
  };

  const requestRemoval = async (targetId: string) => {
    await supabase.from("removal_requests").insert({ target_id: targetId, requested_by: me.id });
    setRequestedIds((prev) => [...prev, targetId]);
  };

  const approveRemoval = async (requestId: string, targetId: string) => {
    await supabase.from("people").delete().eq("id", targetId);
    setPending((prev) => prev.filter((r) => r.id !== requestId));
    setDownline((prev) => prev.filter((p) => p.id !== targetId));
  };

  const rejectRemoval = async (requestId: string) => {
    await supabase.from("removal_requests").delete().eq("id", requestId);
    setPending((prev) => prev.filter((r) => r.id !== requestId));
  };

  const openEdit = (p: Person) => {
    setEditing(p);
    setEditForm({
      rank: p.rank,
      personal_pts: p.personal_pts,
      team_quarterly_pts: p.team_quarterly_pts,
      notes: p.notes ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { data } = await supabase
      .from("people")
      .update({
        rank: editForm.rank,
        personal_pts: editForm.personal_pts,
        team_quarterly_pts: editForm.team_quarterly_pts,
        notes: editForm.notes || null,
      })
      .eq("id", editing.id)
      .select()
      .single();
    if (data) setDownline((prev) => prev.map((p) => (p.id === editing.id ? (data as Person) : p)));
    setEditing(null);
  };

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Équipe</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Ta structure directe. Chacun recrute et fait grandir la sienne.
      </p>

      <section className="rounded-2xl border border-line bg-card p-3.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Ma prochaine étape ({myInfo?.code})
        </div>
        {myNext ? (
          <div className="mt-2 text-sm leading-relaxed text-ink">
            Vers <strong className="text-gold-light">{myNext.code} — {myNext.label}</strong> :<br />
            <span className="text-muted">{myInfo?.next?.label}</span>
          </div>
        ) : (
          <div className="mt-2 text-sm text-muted">Rang le plus élevé du plan.</div>
        )}
      </section>

      {me.is_admin && pending.length > 0 && (
        <section className="mt-3.5 rounded-2xl border border-gold bg-card p-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Demandes de suppression en attente
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            {pending.map((r) => (
              <div key={r.id} className="rounded-lg border border-line bg-card-alt p-2.5">
                <div className="text-sm text-ink">
                  <strong>{r.requester?.name ?? "?"}</strong> demande la suppression de{" "}
                  <strong>{r.target?.name ?? "?"}</strong>
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {new Date(r.created_at).toLocaleDateString("fr-BE")}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => approveRemoval(r.id, r.target_id)}
                    className="rounded-full border border-green px-3 py-1 text-xs text-green"
                  >
                    Confirmer
                  </button>
                  <button onClick={() => rejectRemoval(r.id)} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-3.5 rounded-2xl border border-line bg-card p-3.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Ajouter un collaborateur</div>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <div>
            <label className="mb-1 block text-xs text-muted">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Email (pour qu&apos;il/elle puisse créer son compte)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@example.com"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Rang initial</label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value as Rank)}
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            >
              {RANKS_INFO.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          disabled={!name.trim()}
          onClick={addCollaborator}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold py-2.5 text-sm font-bold text-night disabled:opacity-50"
        >
          <Plus size={16} /> Ajouter à ma structure
        </button>
      </section>

      <div className="mt-3.5 flex flex-col gap-2.5">
        {downline.length === 0 && (
          <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
            Personne dans ta structure directe pour l&apos;instant. Ajoute ta première recrue.
          </div>
        )}
        {downline.map((m) => {
          const info = RANKS_INFO.find((r) => r.code === m.rank);
          const next = nextRank(m.rank);
          const already = requestedIds.includes(m.id) || pending.some((r) => r.target_id === m.id);
          return (
            <div key={m.id} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-ink">{m.name}</div>
                  <div className="text-xs text-gold-light">
                    {info?.code} — {info?.label}
                  </div>
                </div>
                <button onClick={() => openEdit(m)} className="p-1">
                  <Edit3 size={14} className="text-muted" />
                </button>
              </div>
              <div className="mt-2 flex gap-3.5 text-xs text-muted">
                <span>
                  Pts perso : <strong className="text-ink">{m.personal_pts}</strong>
                </span>
                <span>
                  Pts équipe/trim : <strong className="text-ink">{m.team_quarterly_pts}</strong>
                </span>
              </div>
              {next && (
                <div className="mt-2 border-t border-line pt-2 text-xs text-muted">
                  Vers {next.code} : {info?.next?.label}
                </div>
              )}
              {m.notes && <div className="mt-1.5 text-xs text-muted">{m.notes}</div>}
              <div className="mt-2.5 border-t border-line pt-2.5">
                <button
                  disabled={already}
                  onClick={() => requestRemoval(m.id)}
                  className="rounded-full border border-red px-3 py-1 text-xs text-red disabled:opacity-50"
                >
                  {already ? "Demande envoyée — en attente" : "Demander la suppression"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 md:rounded-2xl">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-ink">Modifier {editing.name}</h3>
              <button onClick={() => setEditing(null)}>
                <X size={18} className="text-muted" />
              </button>
            </div>
            <label className="mb-1 block text-xs text-muted">Rang actuel</label>
            <select
              value={editForm.rank}
              onChange={(e) => setEditForm((f) => ({ ...f, rank: e.target.value as Rank }))}
              className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            >
              {RANKS_INFO.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.label}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-xs text-muted">Points de production historique personnelle</label>
            <input
              type="number"
              value={editForm.personal_pts}
              onChange={(e) => setEditForm((f) => ({ ...f, personal_pts: Number(e.target.value) }))}
              className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            <label className="mb-1 block text-xs text-muted">Points de production équipe (dernier trimestre)</label>
            <input
              type="number"
              value={editForm.team_quarterly_pts}
              onChange={(e) => setEditForm((f) => ({ ...f, team_quarterly_pts: Number(e.target.value) }))}
              className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            <label className="mb-1 block text-xs text-muted">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              className="mb-2.5 h-16 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            <button onClick={saveEdit} className="w-full rounded-lg bg-gold py-2.5 text-sm font-bold text-night">
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
