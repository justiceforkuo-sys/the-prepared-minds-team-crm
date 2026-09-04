"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";
import type { OvbPeriod } from "@/types/database";

export function OvbPeriodsPanel({ initialPeriods }: { initialPeriods: OvbPeriod[] }) {
  const supabase = createClient();
  const [periods, setPeriods] = useState(
    [...initialPeriods].sort((a, b) => b.period_month.localeCompare(a.period_month))
  );
  const [periodMonth, setPeriodMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState("");

  const save = async () => {
    if (!periodMonth || !startDate) return;
    const { data } = await supabase
      .from("ovb_periods")
      .upsert({ period_month: periodMonth, start_date: startDate }, { onConflict: "period_month" })
      .select()
      .single();
    if (data) {
      setPeriods((prev) => {
        const without = prev.filter((p) => p.period_month !== periodMonth);
        return [...without, data as OvbPeriod].sort((a, b) => b.period_month.localeCompare(a.period_month));
      });
    }
    setStartDate("");
  };

  const deletePeriod = async (id: string) => {
    await supabase.from("ovb_periods").delete().eq("id", id);
    setPeriods((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        Périodes OVB (le mois ne commence pas toujours le 1er)
      </div>
      <p className="mb-3 text-xs text-muted">
        Renseigne, pour chaque mois, la vraie date à laquelle la période de production
        OVB a commencé (souvent entre le 10 et le 13). Sans réglage pour un mois, le
        mois calendaire classique s&apos;applique.
      </p>

      {periods.length === 0 ? (
        <div className="py-2 text-center text-sm text-muted">Aucune période configurée pour l&apos;instant.</div>
      ) : (
        <div className="mb-3 flex flex-col gap-1.5">
          {periods.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">{p.period_month}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted">débute le {fmtDate(p.start_date)}</span>
                <button onClick={() => deletePeriod(p.id)}>
                  <Trash2 size={12} className="text-red" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={periodMonth}
          onChange={(e) => setPeriodMonth(e.target.value)}
          placeholder="YYYY-MM"
          className="w-24 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
        />
        <button onClick={save} className="flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-night">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
