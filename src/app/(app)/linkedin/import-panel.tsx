"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { classify, buildTeamNames } from "@/lib/linkedin/classify";
import { readLinkedinExport, type ParsedConnection } from "@/lib/linkedin/csv";
import { GROUPS } from "@/lib/linkedin/status";
import type { LinkedinGroup } from "@/lib/linkedin/types";
import { recordLinkedinImport } from "./actions";

export const LINKEDIN_EXPORT_URL = "https://www.linkedin.com/mypreferences/d/download-my-data";

export interface ExistingContact {
  id: string;
  company: string | null;
  position: string | null;
}

interface Prepared {
  conn: ParsedConnection;
  grp: LinkedinGroup;
  priority: 1 | 2 | 3;
  tags: string[];
}

export function ImportPanel({
  ownerId,
  existing,
  teamNames,
  onImported,
}: {
  ownerId: string;
  existing: Map<string, ExistingContact>;
  teamNames: string[];
  onImported: () => Promise<void>;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [prepared, setPrepared] = useState<Prepared[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    setError(null);
    setPrepared(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const conns = await readLinkedinExport(file);
      const team = buildTeamNames(teamNames);
      const seen = new Set<string>();
      const list: Prepared[] = [];
      for (const conn of conns) {
        if (seen.has(conn.linkedin_url)) continue;
        seen.add(conn.linkedin_url);
        const c = classify(
          { firstName: conn.first_name, lastName: conn.last_name, position: conn.position, company: conn.company },
          team
        );
        list.push({ conn, ...c });
      }
      setPrepared(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fichier illisible.");
    }
  };

  const fresh = prepared?.filter((p) => !existing.has(p.conn.linkedin_url)) ?? [];
  // Fiches déjà là dont le poste ou l'entreprise manque (créées par un email « invitation acceptée ») : on les complète
  const completions =
    prepared?.flatMap((p) => {
      const ex = existing.get(p.conn.linkedin_url);
      if (!ex) return [];
      const patch: { company?: string; position?: string } = {};
      if (!ex.company && p.conn.company) patch.company = p.conn.company;
      if (!ex.position && p.conn.position) patch.position = p.conn.position;
      return Object.keys(patch).length > 0 ? [{ id: ex.id, patch }] : [];
    }) ?? [];
  const unchanged = (prepared?.length ?? 0) - fresh.length - completions.length;
  const countBy = (list: Prepared[]) =>
    GROUPS.map((g) => ({ ...g, n: list.filter((p) => p.grp === g.code).length }));

  const run = async () => {
    if (fresh.length === 0 && completions.length === 0) return;
    setBusy(true);
    setSummary(null);
    setProgress(0);
    setError(null);
    const CHUNK = 200;
    for (let i = 0; i < fresh.length; i += CHUNK) {
      const rows = fresh.slice(i, i + CHUNK).map((p) => ({
        owner_id: ownerId,
        first_name: p.conn.first_name,
        last_name: p.conn.last_name,
        linkedin_url: p.conn.linkedin_url,
        company: p.conn.company,
        position: p.conn.position,
        connected_on: p.conn.connected_on,
        grp: p.grp,
        priority: p.priority,
        status: p.grp === "E" ? "Équipe / réseau" : "À contacter",
        tags: p.tags,
      }));
      // ignoreDuplicates : un ré-import n'écrase jamais statuts ni notes
      const { error: err } = await supabase
        .from("linkedin_contacts")
        .upsert(rows, { onConflict: "owner_id,linkedin_url", ignoreDuplicates: true });
      if (err) {
        setError(err.message);
        setBusy(false);
        return;
      }
      setProgress(Math.min(fresh.length, i + CHUNK));
    }
    // Compléter les fiches existantes (jamais statut, note ni groupe)
    for (let i = 0; i < completions.length; i += 20) {
      await Promise.all(completions.slice(i, i + 20).map((c) => supabase.from("linkedin_contacts").update(c.patch).eq("id", c.id)));
    }
    await recordLinkedinImport();
    await onImported();
    setSummary(`${fresh.length} nouvelle${fresh.length > 1 ? "s" : ""} relation${fresh.length > 1 ? "s" : ""}, ${completions.length} fiche${completions.length > 1 ? "s" : ""} complétée${completions.length > 1 ? "s" : ""}, ${unchanged} déjà à jour.`);
    setBusy(false);
    setPrepared(null);
    setFileName("");
    setOpen(false);
  };

  return (
    <div className="mb-3">
      {summary && (
        <div className="mb-2 rounded-lg border border-gold bg-card px-3 py-2 text-xs font-bold text-ink">
          Mise à jour terminée : {summary}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink"
      >
        <Upload size={13} /> Mettre à jour mes relations
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-muted">
            1. Ouvre{" "}
            <a href={LINKEDIN_EXPORT_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-gold-light underline">
              la page de téléchargement de tes données LinkedIn
            </a>{" "}
            et coche <strong className="text-ink">« Relations »</strong> (Connections), puis demande l&apos;archive. 2. Dépose ici le fichier{" "}
            <strong className="text-ink">Connections.csv</strong> (ou le zip complet). Les nouvelles relations sont ajoutées, le poste et l&apos;entreprise
            des fiches créées par email sont complétés : tes statuts, notes et groupes ne sont jamais écrasés.
          </p>
          <input
            type="file"
            accept=".csv,.zip"
            onChange={(e) => pick(e.target.files?.[0])}
            className="mt-3 block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-card-alt file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-ink"
          />
          {fileName && !prepared && !error && <div className="mt-2 text-xs text-muted">Lecture de {fileName}…</div>}
          {error && <div className="mt-2 text-xs text-red">{error}</div>}

          {prepared && (
            <div className="mt-3">
              <div className="text-sm text-ink">
                <strong>{prepared.length}</strong> relations lues · <strong className="text-gold-light">{fresh.length}</strong>{" "}
                nouvelle{fresh.length > 1 ? "s" : ""} · <strong className="text-ink">{completions.length}</strong> fiche{completions.length > 1 ? "s" : ""} à compléter · {unchanged} déjà à jour
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {countBy(fresh).map((g) => (
                  <div key={g.code} className="rounded-lg border border-line bg-card-alt px-2.5 py-1.5 text-xs">
                    <span className="font-bold text-gold-light">{g.code}</span> <span className="text-muted">{g.label}</span>
                    <div className="font-serif text-lg font-semibold text-ink">{g.n}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Le classement est automatique : tu pourras corriger le groupe et la priorité depuis chaque fiche.
              </p>
              <button
                onClick={run}
                disabled={busy || (fresh.length === 0 && completions.length === 0)}
                className="mt-3 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-night disabled:opacity-50"
              >
                {busy ? `Import… ${progress} / ${fresh.length}` : `Mettre à jour : ${fresh.length} nouvelle${fresh.length > 1 ? "s" : ""}, ${completions.length} à compléter`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
