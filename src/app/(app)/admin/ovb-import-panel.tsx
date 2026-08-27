"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR } from "@/lib/format";
import { parseOvbList, type ParsedOvbLine } from "@/lib/parse-ovb-list";
import type { PolicyStatus } from "@/types/database";

interface ImportSummary {
  matched: number;
  created_policies: number;
  created_clients: number;
  unmatched_collaborators: string[];
  committed: boolean;
}

type OvbPolicyRow = {
  id: string;
  worth: number;
  units: number;
  policy_status: PolicyStatus;
  created_at: string;
  client: { name: string } | null;
};

export function OvbImportPanel() {
  const supabase = createClient();
  const [text, setText] = useState("");
  const [mois, setMois] = useState("");
  const [lignes, setLignes] = useState<ParsedOvbLine[]>([]);
  const [nonReconnues, setNonReconnues] = useState<string[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const [reviewMonth, setReviewMonth] = useState("");
  const [reviewRows, setReviewRows] = useState<OvbPolicyRow[] | null>(null);

  const parse = () => {
    const result = parseOvbList(text);
    setLignes(result.lignes);
    setNonReconnues(result.nonReconnues);
    setMois(result.mois ?? "");
    setSummary(null);
  };

  const fetchReviewRows = async (month: string) => {
    if (!month) return;
    const [y, m] = month.split("-").map(Number);
    const start = `${month}-01`;
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("client_policies")
      .select("id, worth, units, policy_status, created_at, client:clients(name)")
      .eq("source", "ovb")
      .gte("created_at", start)
      .lt("created_at", nextMonth)
      .order("created_at");
    setReviewRows((data as unknown as OvbPolicyRow[]) ?? []);
  };

  const runImport = async (doCommit: boolean) => {
    if (!mois || lignes.length === 0) return;
    setBusy(true);
    const payload = lignes.map((l) => ({ ...l, mois }));
    const { data } = await supabase.rpc("import_ovb_contracts", { payload, do_commit: doCommit });
    setSummary(data as ImportSummary);
    setBusy(false);
    if (doCommit) {
      setReviewMonth(mois);
      fetchReviewRows(mois);
    }
  };

  const updateReviewRow = async (id: string, patch: Partial<OvbPolicyRow>) => {
    setReviewRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
    await supabase.from("client_policies").update(patch).eq("id", id);
  };

  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        Import mensuel OVB Willemot
      </div>
      <p className="mb-2.5 text-xs text-muted">
        Colle ici le texte du PDF &quot;Liste des contrats saisis&quot; du mois — les contrats déjà
        présents dans le CRM sont recalés au bon mois, seuls les manquants sont créés.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Colle le texte du relevé OVB ici..."
        className="h-40 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-xs text-ink outline-none focus:border-gold"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={parse}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink"
        >
          Analyser
        </button>
        {lignes.length > 0 && (
          <>
            <label className="text-xs text-muted">Mois :</label>
            <input
              value={mois}
              onChange={(e) => setMois(e.target.value)}
              placeholder="YYYY-MM"
              className="w-24 rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold"
            />
            <span className="text-xs text-muted">{lignes.length} contrats détectés</span>
          </>
        )}
      </div>

      {nonReconnues.length > 0 && (
        <div className="mt-2 rounded-lg border border-red/40 bg-card-alt p-2.5 text-xs text-muted">
          <div className="mb-1 font-bold text-red">{nonReconnues.length} ligne(s) non reconnue(s) :</div>
          {nonReconnues.map((l, i) => (
            <div key={i} className="truncate">{l}</div>
          ))}
        </div>
      )}

      {lignes.length > 0 && (
        <div className="mt-2 flex gap-2">
          <button
            disabled={busy || !mois}
            onClick={() => runImport(false)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink disabled:opacity-50"
          >
            Prévisualiser
          </button>
          {summary && !summary.committed && (
            <button
              disabled={busy}
              onClick={() => runImport(true)}
              className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50"
            >
              Confirmer l&apos;import
            </button>
          )}
        </div>
      )}

      {summary && (
        <div className="mt-2.5 rounded-lg border border-line bg-card-alt p-2.5 text-xs text-ink">
          <div>{summary.matched} contrat(s) déjà existant(s) à recaler au bon mois</div>
          <div>{summary.created_policies} nouveau(x) contrat(s) à créer</div>
          <div>{summary.created_clients} nouveau(x) client(s) à créer</div>
          {summary.unmatched_collaborators.length > 0 && (
            <div className="mt-1 text-red">
              Collaborateur(s) non reconnu(s) : {summary.unmatched_collaborators.join(", ")}
            </div>
          )}
          <div className="mt-1 font-bold text-gold-light">
            {summary.committed ? "Import confirmé." : "Aperçu — rien n'a encore été écrit."}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          Corriger un import déjà fait
        </div>
        <div className="flex items-center gap-2">
          <input
            value={reviewMonth}
            onChange={(e) => setReviewMonth(e.target.value)}
            placeholder="YYYY-MM"
            className="w-24 rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <button
            onClick={() => fetchReviewRows(reviewMonth)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink"
          >
            Charger
          </button>
        </div>
        {reviewRows && (
          <div className="mt-2 flex flex-col gap-1.5">
            {reviewRows.length === 0 && <div className="text-xs text-muted">Aucun contrat importé ce mois-ci.</div>}
            {reviewRows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-md border border-line bg-card-alt p-2 text-xs">
                <div className="flex-1 truncate text-ink">{r.client?.name ?? "?"}</div>
                <input
                  type="number"
                  value={r.units}
                  onChange={(e) => updateReviewRow(r.id, { units: Number(e.target.value) })}
                  className="w-20 rounded-md border border-line bg-card px-1.5 py-1 text-xs text-ink outline-none focus:border-gold"
                />
                <input
                  type="number"
                  value={r.worth}
                  onChange={(e) => updateReviewRow(r.id, { worth: Number(e.target.value) })}
                  className="w-24 rounded-md border border-line bg-card px-1.5 py-1 text-xs text-ink outline-none focus:border-gold"
                />
                <span className="text-muted">{fmtEUR(r.worth)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
