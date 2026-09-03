"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR } from "@/lib/format";
import type { BudgetCategory, BudgetItem } from "@/types/database";

const CATEGORIES: BudgetCategory[] = ["Fixe", "Professionnelle", "Extra", "Annuelle", "Imprévue"];
const CATEGORY_HINT: Record<BudgetCategory, string> = {
  Fixe: "Loyer, crédit, abonnements — récurrent chaque mois.",
  Professionnelle: "Frais liés à l'activité : déplacements, téléphone pro, matériel, cotisations.",
  Extra: "Dépenses variables/discrétionnaires.",
  Annuelle: "Assurances, etc. — entre le montant annuel, divisé par 12 automatiquement.",
  Imprévue: "Une dépense ponctuelle ce mois-ci — comptée en entier, une seule fois.",
};

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

  const totalExpenses = items.reduce((s, i) => s + monthlyEquivalent(i), 0);
  const remaining = currentMonthPayout !== null ? currentMonthPayout - totalExpenses : null;

  const addItem = async () => {
    const amountNum = parseFloat(amount.replace(",", ".")) || 0;
    if (!label.trim() || amountNum <= 0) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data } = await supabase
      .from("budget_items")
      .insert({
        person_id: meId,
        label: label.trim(),
        amount: amountNum,
        category,
        is_annual: category === "Annuelle",
        month: category === "Imprévue" ? currentMonth : null,
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

      <div className="mb-3 flex justify-between rounded-lg border border-line bg-card-alt px-3 py-2 text-sm">
        <span className="font-bold text-ink">Revenus (décompte de ce mois-ci)</span>
        <span className="font-bold text-gold-light">
          {currentMonthPayout !== null ? fmtEUR(currentMonthPayout) : "—"}
        </span>
      </div>

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

      <div className="border-t border-line pt-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Total dépenses (toutes catégories, mensualisé)</span>
          <span className="font-bold text-ink">{fmtEUR(totalExpenses)}</span>
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
