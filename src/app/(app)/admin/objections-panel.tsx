"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fsmaFlags } from "@/lib/linkedin/templates";

export interface Objection {
  id: string;
  libelle: string;
  mots_clients: string[];
  reponse_equipe: string | null;
  validee: boolean;
  ordre: number;
}

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50";

const toLines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Banque d'objections de l'équipe, modifiable par les administrateurs. Une objection est une information sur le client,
 * pas un mur à abattre. Une réponse reste un brouillon (visible des seuls administrateurs) jusqu'à sa validation.
 */
export function ObjectionsPanel({ initial, meId }: { initial: Objection[]; meId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState([...initial].sort((a, b) => a.ordre - b.ordre));
  const [msg, setMsg] = useState<string | null>(null);

  const add = async () => {
    const ordre = rows.reduce((m, r) => Math.max(m, r.ordre), -1) + 1;
    const { data, error } = await supabase
      .from("objections")
      .insert({ libelle: "Nouvelle objection", ordre, creee_par: meId })
      .select()
      .single();
    if (error || !data) return setMsg(error?.message ?? "Création impossible.");
    setRows((cur) => [...cur, data as Objection]);
    setMsg(null);
  };

  const replace = (o: Objection) => setRows((cur) => cur.map((r) => (r.id === o.id ? o : r)).sort((a, b) => a.ordre - b.ordre));

  const remove = async (o: Objection) => {
    if (!window.confirm(`Supprimer l'objection « ${o.libelle} » ?`)) return;
    const { error } = await supabase.from("objections").delete().eq("id", o.id);
    if (error) return setMsg(error.message);
    setRows((cur) => cur.filter((r) => r.id !== o.id));
  };

  const validated = rows.filter((r) => r.validee).length;

  return (
    <div>
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">Banque d&apos;objections</h3>
      <p className="mb-2 text-xs text-muted">
        Une objection est une information sur le client, pas un mur à abattre : « je protège avant de vendre ». Note les formulations réelles, sans nom de personne, puis la réponse de l&apos;équipe, à dire avec ses propres mots. Une réponse reste un
        brouillon (visible de toi seul) tant que tu ne l&apos;as pas validée : les autres ne voient que les réponses validées. {validated} validée{validated > 1 ? "s" : ""} sur {rows.length}.
      </p>

      <div className="flex flex-col gap-2">
        {rows.map((o) => (
          <ObjectionCard key={o.id} o={o} meId={meId} onChange={replace} onDelete={() => remove(o)} setMsg={setMsg} />
        ))}
        {rows.length === 0 && <div className="text-xs text-muted">Aucune objection pour l&apos;instant.</div>}
      </div>

      <button onClick={add} className={`${ghostBtn} mt-2 flex items-center gap-1`}>
        <Plus size={13} /> Ajouter une objection
      </button>
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

function ObjectionCard({ o, meId, onChange, onDelete, setMsg }: { o: Objection; meId: string; onChange: (o: Objection) => void; onDelete: () => void; setMsg: (m: string | null) => void }) {
  const supabase = createClient();
  const [f, setF] = useState({ libelle: o.libelle, mots: o.mots_clients.join("\n"), reponse: o.reponse_equipe ?? "", ordre: String(o.ordre) });
  const [busy, setBusy] = useState(false);

  const flags = fsmaFlags(f.reponse);
  const contentChanged = f.libelle !== o.libelle || f.mots !== o.mots_clients.join("\n") || f.reponse !== (o.reponse_equipe ?? "");
  const dirty = contentChanged || Number(f.ordre) !== o.ordre;

  const save = async (validee: boolean) => {
    if (!f.libelle.trim()) return setMsg("Donne un titre à l'objection.");
    setBusy(true);
    const patch = {
      libelle: f.libelle.trim(),
      mots_clients: toLines(f.mots),
      reponse_equipe: f.reponse.trim() || null,
      ordre: Number.isFinite(Number(f.ordre)) ? Number(f.ordre) : o.ordre,
      validee,
      validee_par: validee ? meId : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("objections").update(patch).eq("id", o.id).select().single();
    setBusy(false);
    if (error || !data) return setMsg(error?.message ?? "Enregistrement impossible.");
    onChange(data as Objection);
    setMsg(validee ? "Réponse validée : elle est visible de toute l'équipe." : "Enregistré.");
  };

  const validate = async () => {
    if (!f.reponse.trim()) return setMsg("Écris d'abord la réponse de l'équipe.");
    if (flags.length && !window.confirm(`Cette réponse contient des mots à risque (${flags.join(", ")}). La valider quand même ?`)) return;
    await save(true);
  };

  return (
    <div className={`rounded-xl border bg-card-alt p-2.5 text-xs ${o.validee ? "border-green" : "border-line"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <input value={f.ordre} inputMode="numeric" onChange={(e) => setF({ ...f, ordre: e.target.value })} className={`${inputCls} w-12`} aria-label="Ordre" />
        <input value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} className={`${inputCls} min-w-[12rem] flex-1 font-bold`} aria-label="Objection" />
        <span className={`flex items-center gap-1 font-bold ${o.validee ? "text-green" : "text-muted"}`}>
          {o.validee ? <CheckCircle2 size={13} /> : null}
          {o.validee ? "Validée" : "Brouillon"}
        </span>
        <button onClick={onDelete} className="text-muted hover:text-red" aria-label="Supprimer l'objection">
          <Trash2 size={14} />
        </button>
      </div>

      <label className="mt-2 block text-muted">
        Ce que le client dit vraiment (une formulation par ligne, sans nom)
        <textarea value={f.mots} onChange={(e) => setF({ ...f, mots: e.target.value })} rows={2} className={`${inputCls} mt-0.5 w-full`} />
      </label>
      <label className="mt-2 block text-muted">
        Réponse de l&apos;équipe (à dire avec tes propres mots)
        <textarea value={f.reponse} onChange={(e) => setF({ ...f, reponse: e.target.value })} rows={4} className={`${inputCls} mt-0.5 w-full`} />
      </label>

      {flags.length > 0 && (
        <div className="mt-1 flex items-start gap-1.5 text-muted">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-gold-light" />
          <span>Mots à risque (FSMA) : {flags.join(", ")}. Pas de promesse de rendement ni de « garanti ».</span>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button disabled={busy || !dirty} onClick={() => save(contentChanged ? false : o.validee)} className={ghostBtn}>
          Enregistrer{o.validee && contentChanged ? " (repasse en brouillon)" : ""}
        </button>
        {!o.validee ? (
          <button disabled={busy} onClick={validate} className={goldBtn}>
            Valider la réponse
          </button>
        ) : (
          <button disabled={busy} onClick={() => save(false)} className={ghostBtn}>
            Retirer la validation
          </button>
        )}
      </div>
    </div>
  );
}
