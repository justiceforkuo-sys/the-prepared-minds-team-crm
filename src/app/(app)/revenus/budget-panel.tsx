"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR } from "@/lib/format";
import type { BudgetCategory, BudgetItem } from "@/types/database";

const CATEGORIES: BudgetCategory[] = ["Fixe", "Extra", "Annuelle / imprévue"];

function monthlyEquivalent(item: BudgetItem): number {
  return item.is_annual ? item.amount / 12 : item.amount;
}

export function BudgetPanel({
  meId,
  initialItems,
  currentMonthPayout,
}: {
  meId: string;
  initialItems: BudgetItem[];
  currentMonthPayout: number | null;
}) {
  const supabase = createClient();
  const [items, setItems] = useState(initialItems);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<BudgetCategory>("Fixe");
  const [isAnnual, setIsAnnual] = useState(true);

  const total = items.reduce((s, i) => s + monthlyEquivalent(i), 0);
  const remaining = currentMonthPayout !== null ? currentMonthPayout - total : null;

  const addItem = async () => {
    const amountNum = parseFloat(amount.replace(",", ".")) || 0;
    if (!label.trim() || amountNum <= 0) return;
    const { data } = await supabase
      .from("budget_items")
      .insert({
        person_id: meId,
        label: label.trim(),
        amount: amountNum,
        category,
        is_annual: category === "Annuelle / imprévue" ? isAnnual : false,
      })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as BudgetItem]);
    setLabel("");
    setAmount("");
  };

  const deleteItem = async (id: string) => {
    await supabase.from("budget_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        Mon budget mensuel
      </div>
      <p className="mb-3 text-xs text-muted">
        Dépenses fixes, extra, et annuelles/imprévues (lissées par 12) — pour savoir, à
        l&apos;euro près, ce qu&apos;il te reste une fois ton décompte reçu.
      </p>

      {CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;
        const catTotal = catItems.reduce((s, i) => s + monthlyEquivalent(i), 0);
        return (
          <div key={cat} className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold text-muted">{cat}</span>
              <span className="font-bold text-ink">{fmtEUR(catTotal)}/mois</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {catItems.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {i.label}
                    {i.is_annual && (
                      <span className="ml-1.5 text-[10px] text-muted">
                        ({fmtEUR(i.amount)}/an → {fmtEUR(i.amount / 12)}/mois)
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {!i.is_annual && <span className="text-muted">{fmtEUR(i.amount)}</span>}
                    <button onClick={() => deleteItem(i.id)}>
                      <Trash2 size={12} className="text-red" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="py-2 text-center text-sm text-muted">Aucune dépense enregistrée.</div>
      )}

      <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-card-alt p-3">
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
            placeholder={category === "Annuelle / imprévue" && isAnnual ? "€/an" : "€/mois"}
            className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BudgetCategory)}
            className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={addItem}
            className="flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-night"
          >
            <Plus size={16} />
          </button>
        </div>
        {category === "Annuelle / imprévue" && (
          <label className="flex items-center gap-1.5 text-[11px] text-muted">
            <input type="checkbox" checked={isAnnual} onChange={(e) => setIsAnnual(e.target.checked)} />
            Montant annuel total (divisé par 12 automatiquement)
          </label>
        )}
      </div>

      <div className="border-t border-line pt-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Total mensuel (toutes catégories)</span>
          <span className="font-bold text-ink">{fmtEUR(total)}</span>
        </div>
        {remaining !== null ? (
          <div className="mt-1 flex justify-between">
            <span className="text-muted">Reste disponible ce mois-ci</span>
            <span className={`font-bold ${remaining >= 0 ? "text-gold-light" : "text-red"}`}>
              {fmtEUR(remaining)}
            </span>
          </div>
        ) : (
          <div className="mt-1 text-xs text-muted">
            Pas encore de décompte enregistré pour ce mois-ci.
          </div>
        )}
      </div>
    </div>
  );
}
