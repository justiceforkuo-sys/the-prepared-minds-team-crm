import { fmtEUR } from "@/lib/format";
import { unitValue } from "@/lib/ranks";
import type { Rank } from "@/types/database";

interface DirectRecruit {
  id: string;
  name: string;
  rank: Rank;
  units: number;
}

export function RevenueBoard({
  rank,
  monthLabel,
  unitsThisMonth,
  unitsTotal,
  directs,
}: {
  rank: Rank;
  monthLabel: string;
  unitsThisMonth: number;
  unitsTotal: number;
  directs: DirectRecruit[];
}) {
  const myUnitValue = unitValue(rank);

  const revenuPerso = unitsThisMonth * myUnitValue;
  const revenuEquipe = directs.reduce(
    (sum, d) => sum + d.units * Math.max(0, myUnitValue - unitValue(d.rank)),
    0
  );
  const revenuTotal = revenuPerso + revenuEquipe;

  return (
    <div>
      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          Ma production — calculée depuis mes polices
        </div>
        <div className="flex items-baseline gap-6">
          <div>
            <div className="font-serif text-xl font-semibold text-gold-light">{unitsThisMonth.toFixed(2)} u</div>
            <div className="text-xs text-muted">{monthLabel}</div>
          </div>
          <div>
            <div className="font-serif text-xl font-semibold text-gold-light">{unitsTotal.toFixed(2)} u</div>
            <div className="text-xs text-muted">Total (toutes polices)</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="font-serif text-xl font-semibold text-gold-light">{fmtEUR(revenuPerso)}</div>
          <div className="text-xs text-muted">Revenu personnel</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="font-serif text-xl font-semibold text-gold-light">{fmtEUR(revenuEquipe)}</div>
          <div className="text-xs text-muted">Revenu d&apos;équipe</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="font-serif text-xl font-semibold text-gold-light">{fmtEUR(revenuTotal)}</div>
          <div className="text-xs text-muted">Revenu total</div>
        </div>
      </div>

      {directs.length > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            Détail commission d&apos;équipe — {monthLabel}
          </div>
          <div className="flex flex-col gap-1.5">
            {directs.map((d) => {
              const diff = Math.max(0, myUnitValue - unitValue(d.rank));
              return (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-ink">
                    {d.name} <span className="text-muted">({d.rank})</span>
                  </span>
                  <span className="text-muted">
                    {d.units.toFixed(2)} u × {diff.toFixed(1)} € = {fmtEUR(d.units * diff)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
