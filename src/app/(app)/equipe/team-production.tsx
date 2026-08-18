import type { TeamProductionRow } from "@/types/database";

export function TeamProduction({ rows }: { rows: TeamProductionRow[] }) {
  if (rows.length <= 1) return null;

  const me = rows.find((r) => r.depth === 0);
  const team = rows.filter((r) => r.depth > 0);
  const teamTotal = team.reduce((s, r) => s + r.units_total, 0);

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
      </div>
      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div
              key={r.person_id}
              className="flex items-center justify-between text-xs"
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
              <span className="flex-shrink-0 text-muted">
                {r.units_this_month.toFixed(2)} u ce mois · {r.units_total.toFixed(2)} u total
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
