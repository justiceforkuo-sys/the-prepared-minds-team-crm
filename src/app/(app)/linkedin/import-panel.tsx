"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { classify, buildTeamNames } from "@/lib/linkedin/classify";
import { readLinkedinExport, type ParsedConnection } from "@/lib/linkedin/csv";
import { GROUPS } from "@/lib/linkedin/status";
import type { LinkedinGroup } from "@/lib/linkedin/types";

interface Prepared {
  conn: ParsedConnection;
  grp: LinkedinGroup;
  priority: 1 | 2 | 3;
  tags: string[];
}

export function ImportPanel({
  ownerId,
  existingUrls,
  teamNames,
  onImported,
}: {
  ownerId: string;
  existingUrls: Set<string>;
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

  const fresh = prepared?.filter((p) => !existingUrls.has(p.conn.linkedin_url)) ?? [];
  const countBy = (list: Prepared[]) =>
    GROUPS.map((g) => ({ ...g, n: list.filter((p) => p.grp === g.code).length }));

  const run = async () => {
    if (fresh.length === 0) return;
    setBusy(true);
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
    await onImported();
    setBusy(false);
    setPrepared(null);
    setFileName("");
    setOpen(false);
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink"
      >
        <Upload size={13} /> Importer mes relations LinkedIn
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-muted">
            Sur LinkedIn : Paramètres → Confidentialité des données → Obtenir une copie de vos données → Connexions.
            Dépose ici le fichier <strong className="text-ink">Connections.csv</strong> (ou le zip complet). Un ré-import
            ajoute seulement les nouvelles relations : tes statuts et notes ne sont jamais écrasés.
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
                nouvelle{fresh.length > 1 ? "s" : ""} · {prepared.length - fresh.length} déjà dans ton pipeline
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
                disabled={busy || fresh.length === 0}
                className="mt-3 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-night disabled:opacity-50"
              >
                {busy ? `Import… ${progress} / ${fresh.length}` : `Importer ${fresh.length} nouvelle${fresh.length > 1 ? "s" : ""} relation${fresh.length > 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
