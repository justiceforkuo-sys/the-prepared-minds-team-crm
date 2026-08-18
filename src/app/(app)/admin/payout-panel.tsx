"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR } from "@/lib/format";
import type { Person, PayoutHistoryRow } from "@/types/database";

const emptyForm = { month: "", a_pro: "", sto_res: "", autre: "", payout: "" };

export function PayoutPanel({ people }: { people: Person[] }) {
  const supabase = createClient();
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [rows, setRows] = useState<PayoutHistoryRow[]>([]);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    supabase
      .from("payout_history")
      .select("*")
      .eq("person_id", personId)
      .order("month", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setRows((data as PayoutHistoryRow[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  const save = async () => {
    if (!form.month) return;
    const payload = {
      person_id: personId,
      month: form.month,
      a_pro: parseFloat(form.a_pro) || 0,
      sto_res: parseFloat(form.sto_res) || 0,
      autre: parseFloat(form.autre) || 0,
      payout: parseFloat(form.payout) || 0,
    };
    const { data } = await supabase
      .from("payout_history")
      .upsert(payload, { onConflict: "person_id,month" })
      .select()
      .single();
    if (data) {
      setRows((prev) => {
        const rest = prev.filter((r) => r.month !== form.month);
        return [...rest, data as PayoutHistoryRow].sort((a, b) => b.month.localeCompare(a.month));
      });
    }
    setForm(emptyForm);
  };

  const remove = async (id: string) => {
    await supabase.from("payout_history").delete().eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Décomptes (payout_history)</div>
      <select
        value={personId}
        onChange={(e) => setPersonId(e.target.value)}
        className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="mb-2.5 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          Ajouter / mettre à jour un mois
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="month"
            value={form.month}
            onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
            className="rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <input
            type="number"
            step="0.01"
            placeholder="A. Pro"
            value={form.a_pro}
            onChange={(e) => setForm((f) => ({ ...f, a_pro: e.target.value }))}
            className="rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Sto Res"
            value={form.sto_res}
            onChange={(e) => setForm((f) => ({ ...f, sto_res: e.target.value }))}
            className="rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Autre"
            value={form.autre}
            onChange={(e) => setForm((f) => ({ ...f, autre: e.target.value }))}
            className="rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Payout"
            value={form.payout}
            onChange={(e) => setForm((f) => ({ ...f, payout: e.target.value }))}
            className="col-span-2 rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
        </div>
        <button
          onClick={save}
          disabled={!form.month}
          className="mt-2.5 w-full rounded-lg bg-gold py-2 text-xs font-bold text-night disabled:opacity-50"
        >
          Enregistrer ce mois
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.length === 0 && <div className="text-xs text-muted">Aucun décompte pour cette personne.</div>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-line bg-card p-2.5 text-xs">
            <span className="text-ink">{r.month}</span>
            <span className="text-muted">
              A.Pro {fmtEUR(r.a_pro)} · Sto {fmtEUR(r.sto_res)} · Autre {fmtEUR(r.autre)}
            </span>
            <span className="font-bold text-gold-light">{fmtEUR(r.payout)}</span>
            <button onClick={() => remove(r.id)}>
              <Trash2 size={12} className="text-red" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
