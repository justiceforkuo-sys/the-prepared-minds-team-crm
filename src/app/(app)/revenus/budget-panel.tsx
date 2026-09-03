"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR } from "@/lib/format";
import type { BudgetCategory, BudgetItem, BudgetEntry } from "@/types/database";

const CATEGORIES: BudgetCategory[] = ["Fixe", "Professionnelle", "Extra", "Annuelle", "Dons / Famille", "Imprévue"];
const CATEGORY_HINT: Record<BudgetCategory, string> = {
  Fixe: "Loyer, crédit, abonnements — récurrent chaque mois.",
  Professionnelle: "Frais liés à l'activité : déplacements, téléphone pro, matériel, cotisations.",
  Extra: "Dépenses variables/discrétionnaires.",
  Annuelle: "Assurances, etc. — entre le montant annuel, divisé par 12 automatiquement.",
  "Dons / Famille": "Ce que tu envoies à la famille ou donnes à des associations.",
  Imprévue: "Une dépense ponctuelle ce mois-ci — comptée en entier, une seule fois.",
};

function monthLabel(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function effectiveAmount(entries: BudgetEntry[], itemId: string, category: BudgetCategory, month: string): number {
  const relevant = entries.filter(
    (e) => e.item_id === itemId && (category === "Imprévue" ? e.month === month : e.month <= month)
  );
  if (relevant.length === 0) return 0;
  return relevant.reduce((a, b) => (b.month > a.month ? b : a)).amount;
}

export function BudgetPanel({
  meId,
  initialItems,
  initialEntries,
  payoutsByMonth,
}: {
  meId: string;
  initialItems: BudgetItem[];
  initialEntries: BudgetEntry[];
  payoutsByMonth: Record<string, number>;
}) {
  const supabase = createClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = currentMonth.slice(0, 4);

  const [items, setItems] = useState(initialItems);
  const [entries, setEntries] = useState(initialEntries);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<BudgetCategory>("Fixe");

  const isCurrentMonth = viewMonth === currentMonth;

  const lines = useMemo(
    () =>
      items.map((i) => ({
        item: i,
        amount: effectiveAmount(entries, i.id, i.category, viewMonth),
      })),
    [items, entries, viewMonth]
  );

  const totalExpenses = lines.reduce((s, l) => s + (l.item.is_annual ? l.amount / 12 : l.amount), 0);
  const payout = payoutsByMonth[viewMonth] ?? null;
  const remaining = payout !== null ? payout - totalExpenses : null;

  const annualTotal = useMemo(() => {
    let total = 0;
    for (const item of items) {
      if (item.is_annual) {
        total += effectiveAmount(entries, item.id, item.category, `${currentYear}-12`);
      } else if (item.category === "Imprévue") {
        total += entries
          .filter((e) => e.item_id === item.id && e.month.startsWith(currentYear))
          .reduce((s, e) => s + e.amount, 0);
      } else {
        for (let m = 1; m <= 12; m++) {
          total += effectiveAmount(entries, item.id, item.category, `${currentYear}-${String(m).padStart(2, "0")}`);
        }
      }
    }
    return total;
  }, [items, entries, currentYear]);

  const addItem = async () => {
    const amountNum = parseFloat(amount.replace(",", ".")) || 0;
    if (!label.trim() || amountNum <= 0) return;
    const { data: newItem } = await supabase
      .from("budget_items")
      .insert({ person_id: meId, label: label.trim(), category, is_annual: category === "Annuelle" })
      .select()
      .single();
    if (newItem) {
      const { data: newEntry } = await supabase
        .from("budget_entries")
        .insert({
          item_id: newItem.id,
          month: category === "Imprévue" ? viewMonth : currentMonth,
          amount: amountNum,
        })
        .select()
        .single();
      setItems((prev) => [...prev, newItem as BudgetItem]);
      if (newEntry) setEntries((prev) => [...prev, newEntry as BudgetEntry]);
    }
    setLabel("");
    setAmount("");
  };

  const deleteItem = async (id: string) => {
    await supabase.from("budget_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setEntries((prev) => prev.filter((e) => e.item_id !== id));
  };

  const commitAmount = async (itemId: string, value: string) => {
    const num = parseFloat(value.replace(",", ".")) || 0;
    const { data } = await supabase
      .from("budget_entries")
      .upsert({ item_id: itemId, month: viewMonth, amount: num }, { onConflict: "item_id,month" })
      .select()
      .single();
    if (data) {
      setEntries((prev) => {
        const withoutThis = prev.filter((e) => !(e.item_id === itemId && e.month === viewMonth));
        return [...withoutThis, data as BudgetEntry];
      });
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Mon budget mensuel</div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setViewMonth((m) => addMonths(m, -1))} className="rounded-md border border-line p-1">
            <ChevronLeft size={14} className="text-muted" />
          </button>
          <span className="w-24 text-center text-xs font-bold capitalize text-ink">{monthLabel(viewMonth)}</span>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            disabled={viewMonth >= currentMonth}
            className="rounded-md border border-line p-1 disabled:opacity-30"
          >
            <ChevronRight size={14} className="text-muted" />
          </button>
        </div>
      </div>

      {!isCurrentMonth && (
        <p className="mb-3 rounded-lg bg-card-alt px-2.5 py-1.5 text-[11px] text-muted">
          Aperçu du mois passé — lecture seule. Reviens au mois en cours pour modifier.
        </p>
      )}

      <div className="mb-3 flex justify-between rounded-lg border border-line bg-card-alt px-3 py-2 text-sm">
        <span className="font-bold text-ink">Revenus ({monthLabel(viewMonth)})</span>
        <span className="font-bold text-gold-light">{payout !== null ? fmtEUR(payout) : "—"}</span>
      </div>

      {CATEGORIES.map((cat) => {
        const catLines = lines.filter((l) => l.item.category === cat);
        if (catLines.length === 0) return null;
        const catTotal = catLines.reduce((s, l) => s + (l.item.is_annual ? l.amount / 12 : l.amount), 0);
        return (
          <div key={cat} className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold text-muted">{cat}</span>
              <span className="font-bold text-ink">{fmtEUR(catTotal)}/mois</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {catLines.map(({ item, amount: amt }) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1 truncate text-ink">{item.label}</span>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {isCurrentMonth ? (
                        <input
                          type="number"
                          min={0}
                          value={amt}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value.replace(",", ".")) || 0;
                            setEntries((prev) => {
                              const others = prev.filter((en) => !(en.item_id === item.id && en.month === viewMonth));
                              return [
                                ...others,
                                { id: "", item_id: item.id, month: viewMonth, amount: num, created_at: "" },
                              ];
                            });
                          }}
                          onBlur={(e) => commitAmount(item.id, e.target.value)}
                          className="w-20 rounded-md border border-line bg-card px-2 py-1 text-right text-xs text-ink outline-none focus:border-gold"
                        />
                      ) : (
                        <span className="text-muted">{fmtEUR(amt)}</span>
                      )}
                      <span className="text-[10px] text-muted">{item.is_annual ? "€/an" : "€"}</span>
                      {isCurrentMonth && (
                        <button onClick={() => deleteItem(item.id)}>
                          <Trash2 size={12} className="text-red" />
                        </button>
                      )}
                    </div>
                  </div>
                  {item.is_annual && (
                    <div className="text-right text-[10px] text-muted">→ {fmtEUR(amt / 12)}/mois</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="py-2 text-center text-sm text-muted">Aucune dépense enregistrée.</div>
      )}

      {isCurrentMonth && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-card-alt p-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BudgetCategory)}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted">{CATEGORY_HINT[category]}</p>
          <div className="flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex : loyer, assurance auto..."
              className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={category === "Annuelle" ? "€/an" : "€"}
              className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            <button
              onClick={addItem}
              className="flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-night"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-line pt-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Total dépenses (toutes catégories, mensualisé)</span>
          <span className="font-bold text-ink">{fmtEUR(totalExpenses)}</span>
        </div>
        {remaining !== null ? (
          <div className="mt-1 flex justify-between">
            <span className="text-muted">Reste disponible</span>
            <span className={`font-bold ${remaining >= 0 ? "text-gold-light" : "text-red"}`}>
              {fmtEUR(remaining)}
            </span>
          </div>
        ) : (
          <div className="mt-1 text-xs text-muted">Pas de décompte enregistré pour ce mois.</div>
        )}
        <div className="mt-2 flex justify-between border-t border-line pt-2">
          <span className="text-muted">Total dépenses {currentYear} (année en cours)</span>
          <span className="font-bold text-ink">{fmtEUR(annualTotal)}</span>
        </div>
      </div>
    </div>
  );
}
