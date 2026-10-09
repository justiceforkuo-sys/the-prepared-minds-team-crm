"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { rangeFor, shiftAnchor, type PeriodKind } from "@/lib/pilotage";
import type { Rank, TeamNumbersRow } from "@/types/database";

const KINDS: { key: PeriodKind; label: string }[] = [
  { key: "semaine", label: "Semaine" },
  { key: "mois", label: "Mois" },
  { key: "trimestre", label: "Trimestre" },
];

const RANK_COLOR: Record<Rank, string> = {
  JFAI: "#8a97b0",
  JFAII: "#e0b93a",
  JFAIII: "#e08a3a",
  FA: "#2fa56f",
  FC: "#3d8fe0",
  CD: "#8a5a3a",
  CR: "#8a5a3a",
  CN: "#8a5a3a",
};

const COLUMNS: { key: keyof TeamNumbersRow; label: string; decimals?: number }[] = [
  { key: "dv_planifies", label: "DV pl." },
  { key: "dv_realises", label: "DV réa." },
  { key: "units", label: "Unités", decimals: 1 },
  { key: "recomm_dv", label: "Rec. DV" },
  { key: "dr_planifies", label: "DR pl." },
  { key: "dr_realises", label: "DR réa." },
  { key: "dossiers", label: "Dossiers" },
  { key: "recomm_dr", label: "Rec. DR" },
];

const isActive = (r: TeamNumbersRow) => COLUMNS.some((c) => (r[c.key] as number) > 0);

export function StructureBoard({
  initialKind,
  initialAnchorIso,
  initialRows,
}: {
  initialKind: PeriodKind;
  initialAnchorIso: string;
  initialRows: TeamNumbersRow[];
}) {
  const supabase = createClient();
  const [kind, setKind] = useState<PeriodKind>(initialKind);
  const [anchor, setAnchor] = useState(() => new Date(initialAnchorIso));
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);

  const load = async (nextKind: PeriodKind, nextAnchor: Date) => {
    setKind(nextKind);
    setAnchor(nextAnchor);
    setLoading(true);
    const range = rangeFor(nextKind, nextAnchor);
    const { data } = await supabase.rpc("get_team_numbers", { p_start: range.start, p_end: range.end });
    setRows((data as TeamNumbersRow[] | null) ?? []);
    setLoading(false);
  };

  const range = rangeFor(kind, anchor);
  const visible = onlyActive ? rows.filter(isActive) : rows;
  const totals = COLUMNS.map((c) => visible.reduce((s, r) => s + (r[c.key] as number), 0));

  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => load(k.key, new Date())}
              className={`rounded-lg px-3 py-1 text-xs font-bold ${
                kind === k.key ? "bg-gold text-night" : "border border-line text-muted"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(kind, shiftAnchor(kind, anchor, -1))}
            className="rounded-lg border border-line p-1 text-muted"
            aria-label="Période précédente"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-36 text-center text-xs capitalize text-ink">{range.label}</span>
          <button
            onClick={() => load(kind, shiftAnchor(kind, anchor, 1))}
            className="rounded-lg border border-line p-1 text-muted"
            aria-label="Période suivante"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <label className="mb-2 flex items-center gap-1.5 text-[11px] text-muted">
        <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
        Seulement les collaborateurs actifs sur la période
      </label>

      <div className={`overflow-x-auto ${loading ? "opacity-50" : ""}`}>
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-muted">
              <th className="py-1.5 pr-2 font-bold">Collaborateur</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-1.5 py-1.5 text-right font-bold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.person_id} className="border-t border-line">
                <td
                  className="py-1.5 pr-2"
                  style={{ borderLeft: `4px solid ${RANK_COLOR[r.rank] ?? "#8a97b0"}`, paddingLeft: 8 + r.depth * 12 }}
                >
                  <div className="font-bold text-ink">{r.name}</div>
                  <div className="text-[10px] text-muted">
                    {r.rank}
                    {r.coach_name ? ` · coach : ${r.coach_name}` : ""}
                  </div>
                </td>
                {COLUMNS.map((c) => {
                  const v = r[c.key] as number;
                  return (
                    <td key={c.key} className={`px-1.5 py-1.5 text-right ${v > 0 ? "font-bold text-ink" : "text-muted"}`}>
                      {v > 0 ? v.toFixed(c.decimals ?? 0) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-line">
              <td className="py-2 pr-2 text-[11px] font-bold uppercase tracking-wide text-muted">Total</td>
              {COLUMNS.map((c, i) => (
                <td key={c.key} className="px-1.5 py-2 text-right font-bold text-gold-light">
                  {totals[i].toFixed(c.decimals ?? 0)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {visible.length === 0 && <div className="py-4 text-center text-xs text-muted">Aucune donnée sur cette période.</div>}
      </div>
    </div>
  );
}
