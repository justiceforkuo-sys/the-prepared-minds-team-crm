"use client";

import { useMemo, useState } from "react";
import { fmtEUR } from "@/lib/format";
import { unitValue } from "@/lib/ranks";
import { IARD_PRODUCTS, VIE_PRODUCTS } from "@/lib/commission-products";
import type { Rank } from "@/types/database";

type Category = "iard" | "vie";

export function CommissionSimulator({ rank }: { rank: Rank }) {
  const [category, setCategory] = useState<Category>("iard");
  const [productId, setProductId] = useState(IARD_PRODUCTS[0].id);
  const [vieProductId, setVieProductId] = useState(VIE_PRODUCTS[0].id);
  const [amount, setAmount] = useState("");

  const iardProduct = IARD_PRODUCTS.find((p) => p.id === productId) ?? IARD_PRODUCTS[0];
  const vieProduct = VIE_PRODUCTS.find((p) => p.id === vieProductId) ?? VIE_PRODUCTS[0];

  const amountNum = parseFloat(amount.replace(",", ".")) || 0;

  const units = useMemo(() => {
    if (category === "iard") return (amountNum / 1000) * iardProduct.perThousand;
    if (vieProduct.basis === "capital") return (amountNum / 1000) * vieProduct.factor;
    return amountNum * vieProduct.factor;
  }, [category, amountNum, iardProduct, vieProduct]);

  const revenue = units * unitValue(rank);

  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Simulateur de commission</div>

      <div className="mb-2.5 flex gap-2">
        {(["iard", "vie"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-bold ${
              category === c ? "border-gold bg-line text-gold-light" : "border-line text-muted"
            }`}
          >
            {c === "iard" ? "IARD" : "Vie"}
          </button>
        ))}
      </div>

      {category === "iard" ? (
        <>
          <label className="mb-1 block text-xs text-muted">Produit</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {IARD_PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.perThousand} u/1000)
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-muted">Prime annuelle (€)</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
        </>
      ) : (
        <>
          <label className="mb-1 block text-xs text-muted">Compagnie</label>
          <select
            value={vieProductId}
            onChange={(e) => setVieProductId(e.target.value)}
            className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {VIE_PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-muted">
            {vieProduct.basis === "capital" ? "Capital assuré (€)" : "Prime mensuelle (€)"}
          </label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
        </>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-card-alt p-2.5">
          <div className="font-serif text-lg font-semibold text-gold-light">{units.toFixed(2)}</div>
          <div className="text-xs text-muted">Unités générées</div>
        </div>
        <div className="rounded-lg border border-line bg-card-alt p-2.5">
          <div className="font-serif text-lg font-semibold text-gold-light">{fmtEUR(revenue)}</div>
          <div className="text-xs text-muted">Revenu estimé (mon rang)</div>
        </div>
      </div>
    </div>
  );
}
