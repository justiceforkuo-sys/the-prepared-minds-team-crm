import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { RANKS_INFO } from "@/lib/ranks";
import { fmtEUR } from "@/lib/format";
import { RevenueBoard } from "./revenue-board";
import { CommissionSimulator } from "./commission-simulator";
import { BudgetPanel } from "./budget-panel";
import type { TeamProductionRow, BudgetItem } from "@/types/database";

export default async function RevenusPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const monthLabel = new Date().toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
  const currentMonth = new Date().toISOString().slice(0, 7);
  const supabase = await createClient();

  const [{ data: production }, { data: payouts }, { data: budgetItems }] = await Promise.all([
    supabase.rpc("get_team_production"),
    supabase.from("payout_history").select("*").eq("person_id", person.id).order("month", { ascending: false }),
    supabase.from("budget_items").select("*").eq("person_id", person.id).order("created_at"),
  ]);

  const currentMonthPayout = payouts?.find((p) => p.month === currentMonth)?.payout ?? null;

  const rows = (production as TeamProductionRow[] | null) ?? [];
  const me = rows.find((r) => r.depth === 0);
  const directs = rows
    .filter((r) => r.depth === 1)
    .map((r) => ({ id: r.person_id, name: r.name, rank: r.rank, units: r.units_this_month }));

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Revenus</h2>
      <div className="mt-1 mb-4 text-xs text-muted">
        Mon rang actuel : <span className="text-gold-light">{person.rank}</span>
      </div>

      <RevenueBoard
        rank={person.rank}
        monthLabel={monthLabel}
        unitsThisMonth={me?.units_this_month ?? 0}
        unitsTotal={me?.units_total ?? 0}
        directs={directs}
      />

      <div className="mt-4">
        <CommissionSimulator rank={person.rank} />
      </div>

      <BudgetPanel
        meId={person.id}
        initialItems={(budgetItems as BudgetItem[]) ?? []}
        currentMonthPayout={currentMonthPayout}
      />

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          Valeur d&apos;unité par rang
        </div>
        <div className="flex flex-col gap-1.5">
          {RANKS_INFO.map((r) => (
            <div key={r.code} className="flex justify-between text-sm">
              <span className={r.code === person.rank ? "font-bold text-gold-light" : "text-ink"}>
                {r.code} — {r.label}
              </span>
              <span className="text-muted">{r.unitValue.toFixed(1)} €</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          Historique des décomptes réels
        </div>
        {!payouts || payouts.length === 0 ? (
          <div className="py-2 text-center text-sm text-muted">Aucun décompte enregistré pour l&apos;instant.</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {payouts.map((p) => (
              <div key={p.month} className="flex justify-between text-sm">
                <span className="text-ink">{p.month}</span>
                <span className="text-muted">{fmtEUR(p.payout)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
