import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { fmtEUR } from "@/lib/format";
import { unitValue, overrideValue } from "@/lib/ranks";
import type { ProspectStage, TeamProductionRow, CompanyRankingRow, MonthlyProductionRow } from "@/types/database";

const PIPELINE_STAGES: ProspectStage[] = ["Contact", "Invité", "Présentation faite", "Suivi", "Partenaire"];
const STAGE_COLOR: Record<ProspectStage, string> = {
  Contact: "#5a6b85",
  Invité: "#1e3a6d",
  "Présentation faite": "#2f5fa8",
  Suivi: "#3f7d5c",
  Partenaire: "#3f7d5c",
  Perdu: "#b3543a",
};

export default async function DashboardPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const [
    { count: clientsCount },
    { data: prospects },
    { count: downlineCount },
    { data: production },
    { data: companyRanking },
    { data: monthly },
    { data: payouts },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("owner_id", person.id),
    supabase.from("prospects").select("stage").eq("owner_id", person.id),
    supabase.from("people").select("*", { count: "exact", head: true }).eq("reports_to", person.id),
    supabase.rpc("get_team_production"),
    supabase.rpc("get_company_ranking"),
    supabase.rpc("get_person_monthly_production", { target_id: person.id }),
    supabase
      .from("payout_history")
      .select("month, payout")
      .eq("person_id", person.id)
      .order("month", { ascending: false })
      .limit(6),
  ]);

  const prospectList = prospects ?? [];
  const stats = [
    { label: "Clients (mon book)", value: clientsCount ?? 0 },
    { label: "Prospects actifs", value: prospectList.length },
    { label: "Recrues directes", value: downlineCount ?? 0 },
  ];

  const maxStage = Math.max(1, ...PIPELINE_STAGES.map((s) => prospectList.filter((p) => p.stage === s).length));

  const teamRows = (production as TeamProductionRow[] | null) ?? [];
  const me = teamRows.find((r) => r.depth === 0);
  const downlineRows = teamRows.filter((r) => r.depth > 0);
  const myUnitsThisMonth = me?.units_this_month ?? 0;
  const myUnitsTotal = me?.units_total ?? 0;
  const myEURThisMonth = unitValue(person.rank) * myUnitsThisMonth;
  const myEURTotal = unitValue(person.rank) * myUnitsTotal;
  const overrideThisMonth = downlineRows.reduce(
    (sum, r) => sum + overrideValue(person.rank, r.rank, r.units_this_month),
    0
  );
  const overrideTotal = downlineRows.reduce(
    (sum, r) => sum + overrideValue(person.rank, r.rank, r.units_total),
    0
  );

  const ranking = (companyRanking as CompanyRankingRow[] | null) ?? [];
  const position = ranking.findIndex((r) => r.person_id === person.id) + 1;
  const top3 = ranking.slice(0, 3);
  const showOwnRow = position > 3;

  const monthlyRows = (monthly as MonthlyProductionRow[] | null) ?? [];
  const maxMonthlyUnits = Math.max(1, ...monthlyRows.map((m) => m.units));

  const paidMonths = (payouts ?? []).filter((p) => p.payout > 0);
  const avgPayout = paidMonths.length ? paidMonths.reduce((sum, p) => sum + p.payout, 0) / paidMonths.length : null;

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Tableau</h2>
      <div className="mt-1 mb-4 text-xs text-muted">
        {person.name} — {person.rank}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-3.5">
            <div className="font-serif text-2xl font-semibold text-gold-light">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          Pipeline de recrutement
        </div>
        {prospectList.length === 0 ? (
          <div className="py-2 text-center text-sm text-muted">Aucun prospect pour l&apos;instant.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {PIPELINE_STAGES.map((stage) => {
              const count = prospectList.filter((p) => p.stage === stage).length;
              return (
                <div key={stage} className="flex items-center gap-2">
                  <div className="w-28 flex-shrink-0 text-xs text-muted">{stage}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-alt">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / maxStage) * 100}%`, background: STAGE_COLOR[stage] }}
                    />
                  </div>
                  <div className="w-5 flex-shrink-0 text-right text-xs font-bold text-ink">{count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Ma production</div>
          <div className="font-serif text-2xl font-semibold text-gold-light">{fmtEUR(myEURThisMonth)}</div>
          <div className="text-xs text-muted">{myUnitsThisMonth.toFixed(2)} u ce mois-ci</div>
          <div className="mt-2 border-t border-line pt-2 text-xs text-muted">
            Total depuis le début : <span className="font-bold text-ink">{fmtEUR(myEURTotal)}</span> (
            {myUnitsTotal.toFixed(2)} u)
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            Ce que mon équipe me rapporte
          </div>
          <div className="font-serif text-2xl font-semibold text-gold-light">{fmtEUR(overrideThisMonth)}</div>
          <div className="text-xs text-muted">ce mois-ci, sur {downlineRows.length} collaborateur(s)</div>
          <div className="mt-2 border-t border-line pt-2 text-xs text-muted">
            Total depuis le début : <span className="font-bold text-ink">{fmtEUR(overrideTotal)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            Podium de l&apos;entreprise (ce mois-ci)
          </div>
          {ranking.length === 0 ? (
            <div className="text-sm text-muted">Pas encore de production enregistrée ce mois-ci.</div>
          ) : (
            <>
              {position > 0 && (
                <div className="mb-2 font-serif text-2xl font-semibold text-gold-light">
                  #{position} <span className="text-sm text-muted">sur {ranking.length}</span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                {top3.map((r, i) => (
                  <div
                    key={r.person_id}
                    className={`flex justify-between text-xs ${
                      r.person_id === person.id ? "font-bold text-gold-light" : "text-muted"
                    }`}
                  >
                    <span>
                      {i + 1}. {r.name} <span className="text-muted">({r.rank})</span>
                    </span>
                    <span>{fmtEUR(unitValue(r.rank) * r.units_this_month)}</span>
                  </div>
                ))}
                {showOwnRow && (
                  <div className="flex justify-between text-xs font-bold text-gold-light">
                    <span>
                      {position}. {person.name} <span className="text-muted">({person.rank})</span>
                    </span>
                    <span>{fmtEUR(myEURThisMonth)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Revenus moyens</div>
          {avgPayout !== null ? (
            <>
              <div className="font-serif text-2xl font-semibold text-gold-light">{fmtEUR(avgPayout)}</div>
              <div className="text-xs text-muted">Moyenne des {paidMonths.length} derniers mois versés</div>
            </>
          ) : (
            <div className="text-sm text-muted">Pas encore de données de revenus enregistrées.</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Ma progression mensuelle</div>
        {monthlyRows.every((m) => m.units === 0) ? (
          <div className="py-2 text-center text-sm text-muted">Aucune production enregistrée.</div>
        ) : (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {[...monthlyRows].reverse().map((m) => {
              const label = new Date(`${m.month}-01`).toLocaleDateString("fr-BE", { month: "short", year: "numeric" });
              return (
                <div key={m.month} className="flex items-center gap-2">
                  <div className="w-16 flex-shrink-0 text-xs capitalize text-muted">{label}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-alt">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${(m.units / maxMonthlyUnits) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 flex-shrink-0 text-right text-xs font-bold text-ink">
                    {fmtEUR(unitValue(person.rank) * m.units)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
