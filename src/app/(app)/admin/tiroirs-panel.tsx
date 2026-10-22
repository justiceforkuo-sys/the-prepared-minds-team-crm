"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Tiroir } from "@/lib/idees";

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50";

/** Tiroirs du bloc « Mes idées » : liste par défaut (version simplifiée) et listes propres à une personne (ex. les 31 tiroirs de Justice). */
export function TiroirsPanel({ initial, people }: { initial: Tiroir[]; people: { id: string; name: string }[] }) {
  const supabase = createClient();
  const [all, setAll] = useState(initial);
  const [scope, setScope] = useState<string>("default");
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ownerId = scope === "default" ? null : scope;
  const rows = all.filter((t) => t.owner_id === ownerId).sort((a, b) => a.numero - b.numero);

  const reload = async () => {
    const { data } = await supabase.from("tiroirs").select("*").order("numero");
    setAll((data as Tiroir[] | null) ?? []);
  };

  const saveRow = async (t: Tiroir) => {
    const { error } = await supabase.from("tiroirs").update({ numero: t.numero, nom: t.nom, famille: t.famille }).eq("id", t.id);
    setMsg(error ? error.message : "Enregistré");
  };
  const removeRow = async (id: number) => {
    const { error } = await supabase.from("tiroirs").delete().eq("id", id);
    if (error) setMsg(error.message);
    else setAll((a) => a.filter((t) => t.id !== id));
  };
  const addRow = async () => {
    const numero = rows.reduce((m, t) => Math.max(m, t.numero), 0) + 1;
    const { error } = await supabase.from("tiroirs").insert({ owner_id: ownerId, numero, nom: "Nouveau tiroir", famille: null });
    if (error) setMsg(error.message);
    else await reload();
  };

  // Remplace toute la liste : une ligne par tiroir, « nom » ou « nom ; famille »
  const replaceAll = async () => {
    const lines = bulk
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*\d+\s*[.)\-:]\s*/, "").trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    if (!window.confirm(`Remplacer la liste actuelle (${rows.length}) par ces ${lines.length} tiroirs ?`)) return;
    setBusy(true);
    const del = ownerId === null ? supabase.from("tiroirs").delete().is("owner_id", null) : supabase.from("tiroirs").delete().eq("owner_id", ownerId);
    const { error: e1 } = await del;
    if (e1) {
      setMsg(e1.message);
      setBusy(false);
      return;
    }
    const { error: e2 } = await supabase.from("tiroirs").insert(
      lines.map((l, i) => {
        const [nom, famille] = l.split(";").map((x) => x.trim());
        return { owner_id: ownerId, numero: i + 1, nom, famille: famille || null };
      })
    );
    setMsg(e2 ? e2.message : `${lines.length} tiroirs enregistrés.`);
    setBulk("");
    await reload();
    setBusy(false);
  };

  return (
    <div>
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">Tiroirs des idées</h3>
      <p className="mb-2 text-xs text-muted">
        Liste par défaut (version simplifiée) pour tous, et liste propre à une personne si elle en a une (ex. les 31 tiroirs de Justice). Claude range chaque idée dans l&apos;un de ces tiroirs.
      </p>
      <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls}>
        <option value="default">Liste par défaut (tous)</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            Liste de {p.name} {all.some((t) => t.owner_id === p.id) ? `(${all.filter((t) => t.owner_id === p.id).length})` : "(vide : utilise la liste par défaut)"}
          </option>
        ))}
      </select>

      <div className="mt-3 flex flex-col gap-1.5">
        {rows.map((t) => (
          <TiroirLine key={t.id} t={t} onSave={saveRow} onDelete={() => removeRow(t.id)} />
        ))}
        {rows.length === 0 && <div className="text-xs text-muted">Aucun tiroir dans cette liste.</div>}
      </div>
      <button onClick={addRow} className={`${ghostBtn} mt-2`}>
        Ajouter un tiroir
      </button>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-bold text-ink">Coller toute une liste (remplace la liste actuelle)</summary>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={6} placeholder={"Un tiroir par ligne : « Nom » ou « Nom ; famille »\nLa numérotation éventuelle (1. 2. …) est ignorée."} className={`${inputCls} mt-2 w-full`} />
        <button disabled={busy || !bulk.trim()} onClick={replaceAll} className={`${goldBtn} mt-2`}>
          Remplacer la liste
        </button>
      </details>
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

function TiroirLine({ t, onSave, onDelete }: { t: Tiroir; onSave: (t: Tiroir) => void; onDelete: () => void }) {
  const [f, setF] = useState(t);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input value={f.numero} inputMode="numeric" onChange={(e) => setF({ ...f, numero: Number(e.target.value) || 0 })} className={`${inputCls} w-12`} />
      <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} className={`${inputCls} min-w-[12rem] flex-1`} />
      <input value={f.famille ?? ""} placeholder="Famille" onChange={(e) => setF({ ...f, famille: e.target.value || null })} className={`${inputCls} w-32`} />
      <button onClick={() => onSave(f)} className={ghostBtn}>
        Enregistrer
      </button>
      <button onClick={onDelete} className="text-xs text-muted underline">
        Supprimer
      </button>
    </div>
  );
}
