"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR } from "@/lib/format";
import { unitValue, overrideValue } from "@/lib/ranks";
import type { TeamProductionRow, MonthlyProductionRow } from "@/types/database";

export function TeamProduction({ rows }: { rows: TeamProductionRow[] }) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, MonthlyProductionRow[]>>({});

  if (rows.length <= 1) return null;

  const me = rows.find((r) => r.depth === 0);
  const team = rows.filter((r) => r.depth > 0);
  const teamTotal = team.reduce((s, r) => s + r.units_total, 0);
  const overrideThisMonth = me
    ? team.reduce((s, r) => s + overrideValue(me.rank, r.rank, r.units_this_month), 0)
    : 0;
  const overrideTotal = me ? team.reduce((s, r) => s + overrideValue(me.rank, r.rank, r.units_total), 0) : 0;

  const toggle = async (personId: string) => {
    if (expanded === personId) {
      setExpanded(null);
      return;
    }
    setExpanded(personId);
    if (!history[personId]) {
      const { data } = await supabase.rpc("get_person_monthly_production", {
        target_id: personId,
      });
      setHistory((prev) => ({ ...prev, [personId]: (data as MonthlyProductionRow[] | null) ?? [] }));
    }
  };

  return (
    <div className="mt-3.5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        Production de l&apos;équipe (toute la cascade)
      </div>
      <div className="mb-2.5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="font-serif text-lg font-semibold text-gold-light">{(me?.units_total ?? 0).toFixed(2)} u</div>
          <div className="text-xs text-muted">Ma production totale</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="font-serif text-lg font-semibold text-gold-light">{teamTotal.toFixed(2)} u</div>
          <div className="text-xs text-muted">Production totale équipe ({team.length} pers.)</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="font-serif text-lg font-semibold text-gold-light">{fmtEUR(overrideThisMonth)}</div>
          <div className="text-xs text-muted">Mon override ce mois-ci</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="font-serif text-lg font-semibold text-gold-light">{fmtEUR(overrideTotal)}</div>
          <div className="text-xs text-muted">Mon override depuis le début</div>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => {
            const rowOverride = me && r.depth > 0 ? overrideValue(me.rank, r.rank, r.units_this_month) : 0;
            const isOpen = expanded === r.person_id;
            const rowHistory = history[r.person_id];
            return (
              <div key={r.person_id}>
                <button
                  onClick={() => toggle(r.person_id)}
                  className="flex w-full items-center justify-between text-left text-xs"
                  style={{ paddingLeft: r.depth * 14 }}
                >
                  <span className={r.depth === 0 ? "font-bold text-gold-light" : "text-ink"}>
                    {r.depth > 0 && "— "}
                    {r.name}{" "}
                    <span className="text-muted">
                      ({r.rank}
                      {r.active === false ? ", inactif" : ""})
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-right text-muted">
                    <span className="block">
                      {r.units_this_month.toFixed(2)} u ce mois · {r.units_total.toFixed(2)} u total
                    </span>
                    <span className="block">
                      {fmtEUR(unitValue(r.rank) * r.units_this_month)}
                      {r.depth > 0 && rowOverride > 0 && (
                        <span className="text-gold-light"> · +{fmtEUR(rowOverride)} pour toi</span>
                      )}
                    </span>
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-1 mb-1 flex flex-col gap-1 border-l border-line pl-3" style={{ marginLeft: r.depth * 14 }}>
                    {!rowHistory ? (
                      <div className="py-1 text-[11px] text-muted">Chargement...</div>
                    ) : rowHistory.every((m) => m.units === 0) ? (
                      <div className="py-1 text-[11px] text-muted">Aucune production enregistrée.</div>
                    ) : (
                      rowHistory.map((m) => (
                        <div key={m.month} className="flex justify-between text-[11px] text-muted">
                          <span className="capitalize">
                            {new Date(`${m.month}-01`).toLocaleDateString("fr-BE", { month: "short", year: "numeric" })}
                          </span>
                          <span>
                            {m.units.toFixed(2)} u · {fmtEUR(unitValue(r.rank) * m.units)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
