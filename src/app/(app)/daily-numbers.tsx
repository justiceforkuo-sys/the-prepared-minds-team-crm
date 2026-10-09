"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { DailyActivity } from "@/types/database";

type NumberKey = "dv_planifies" | "dv_realises" | "recomm_dv" | "dossiers" | "dr_planifies" | "dr_realises" | "recomm_dr";

const FIELDS: { key: NumberKey; label: string }[] = [
  { key: "dv_planifies", label: "DV planifiés" },
  { key: "dv_realises", label: "DV réalisés" },
  { key: "recomm_dv", label: "Recomm. DV" },
  { key: "dossiers", label: "Dossiers" },
  { key: "dr_planifies", label: "DR planifiés" },
  { key: "dr_realises", label: "DR réalisés" },
  { key: "recomm_dr", label: "Recomm. DR" },
];

export function DailyNumbers({
  personId,
  today,
  todayRow,
  weekRows,
  unitsThisMonth,
}: {
  personId: string;
  today: string;
  todayRow: DailyActivity | null;
  weekRows: DailyActivity[];
  unitsThisMonth: number;
}) {
  const supabase = createClient();
  const initial = (key: NumberKey) => todayRow?.[key] ?? 0;
  const [values, setValues] = useState<Record<NumberKey, string>>(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, String(initial(f.key))])) as Record<NumberKey, string>
  );
  const [saved, setSaved] = useState<Record<NumberKey, number>>(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, initial(f.key)])) as Record<NumberKey, number>
  );
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  const otherDaysTotal = (key: NumberKey) =>
    weekRows.filter((r) => r.date !== today).reduce((s, r) => s + (r[key] ?? 0), 0);

  const dirty = FIELDS.some((f) => (parseInt(values[f.key], 10) || 0) !== saved[f.key]);

  const save = async () => {
    setStatus("saving");
    const payload = Object.fromEntries(FIELDS.map((f) => [f.key, Math.max(0, parseInt(values[f.key], 10) || 0)])) as Record<
      NumberKey,
      number
    >;
    const { error } = await supabase
      .from("daily_activity")
      .upsert({ person_id: personId, date: today, ...payload }, { onConflict: "person_id,date" });
    if (error) {
      setStatus("idle");
      return;
    }
    setSaved(payload);
    setValues(Object.fromEntries(FIELDS.map((f) => [f.key, String(payload[f.key])])) as Record<NumberKey, string>);
    setStatus("done");
    setTimeout(() => setStatus("idle"), 1500);
  };

  return (
    <div className="mb-3 rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Mes chiffres du jour</div>
          <div className="text-[11px] text-muted">Additionnés automatiquement sur la semaine</div>
        </div>
        <button
          onClick={save}
          disabled={!dirty || status === "saving"}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-40"
        >
          <Save size={13} />
          {status === "done" ? "Enregistré" : "Enregistrer"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {FIELDS.map((f) => {
          const current = parseInt(values[f.key], 10) || 0;
          return (
            <div key={f.key}>
              <label className="mb-1 block text-[11px] text-muted">{f.label}</label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full rounded-lg border border-line bg-card-alt px-2.5 py-1.5 text-sm text-ink outline-none focus:border-gold"
              />
              <div className="mt-0.5 text-[10px] text-muted">semaine : {otherDaysTotal(f.key) + current}</div>
            </div>
          );
        })}
        <div>
          <label className="mb-1 block text-[11px] text-muted">Unités</label>
          <div className="rounded-lg border border-line bg-card-alt px-2.5 py-1.5 text-sm text-muted">
            {unitsThisMonth.toFixed(1)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted">auto — ce mois (clients)</div>
        </div>
      </div>
    </div>
  );
}
