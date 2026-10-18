import { projectEndOfMonth, statProjection, type MonthProgress } from "@/lib/pilotage";
import { ProgressBar, StatBox } from "@/components/stat-bits";
import type { TeamEngagementRow, TeamNumbersRow } from "@/types/database";

export function GroupEngagement({
  periodLabel,
  progress,
  engagements,
  monthNumbers,
}: {
  periodLabel: string;
  progress: MonthProgress;
  engagements: TeamEngagementRow[];
  monthNumbers: TeamNumbersRow[];
}) {
  const withGoal = engagements.filter((e) => e.objectif_unites > 0 || e.objectif_recrues > 0);
  const goalUnits = engagements.reduce((s, e) => s + e.objectif_unites, 0);
  const goalRecrues = engagements.reduce((s, e) => s + e.objectif_recrues, 0);
  // On compare comme avec comme : seuls les collaborateurs qui ont fixé un objectif comptent dans le réalisé.
  const goalIds = new Set(withGoal.map((e) => e.person_id));
  const counted = monthNumbers.filter((r) => goalIds.has(r.person_id));
  const units = counted.reduce((s, r) => s + r.units, 0);
  const dossiers = counted.reduce((s, r) => s + r.dossiers, 0);
  const dvRealises = counted.reduce((s, r) => s + r.dv_realises, 0);
  const drRealises = counted.reduce((s, r) => s + r.dr_realises, 0);

  const pct = goalUnits > 0 ? (units / goalUnits) * 100 : 0;
  const projUnits = projectEndOfMonth(units, progress);
  const proj = statProjection(goalUnits - units, goalRecrues - dossiers, progress.weeksLeft);
  const fmt = (n: number) => Math.ceil(n).toString();

  return (
    <div className="mb-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Engagement de l&apos;équipe</div>
        <div className="text-[11px] text-muted">
          {periodLabel} — {withGoal.length} collaborateur{withGoal.length > 1 ? "s" : ""} sur {engagements.length} ont
          fixé un objectif
        </div>
        {progress.stale && (
          <div className="mt-0.5 text-[11px] text-red">
            Aucune période OVB plus récente n&apos;est configurée : ajoute-la dans Admin → Périodes OVB.
          </div>
        )}
      </div>

      {goalUnits === 0 && goalRecrues === 0 ? (
        <p className="text-xs text-muted">
          Personne n&apos;a encore fixé son engagement du mois (onglet Objectifs → Mon engagement).
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 flex items-end justify-between">
              <div className="text-xs text-muted">
                Unités : <strong className="text-ink">{units.toFixed(1)}</strong> / {goalUnits.toFixed(0)} (somme des
                engagements perso)
              </div>
              <div className="text-xs font-bold text-gold-light">{Math.round(pct)}% atteint</div>
            </div>
            <ProgressBar pct={pct} />
            <div className="mt-1 text-[11px] text-muted">
              Projection fin de mois (rythme actuel) : <strong className="text-ink">{projUnits.toFixed(1)}</strong> (
              {goalUnits > 0 ? Math.round((projUnits / goalUnits) * 100) : 0}%)
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBox label="DV réalisés" value={String(dvRealises)} />
            <StatBox label="DR réalisés" value={String(drRealises)} />
            <StatBox label="Unités" value={units.toFixed(1)} sub={`/ ${goalUnits.toFixed(0)}`} />
            <StatBox label="Dossiers recrutement" value={String(dossiers)} sub={`/ ${goalRecrues}`} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBox label="DV planifiés à faire" value={fmt(proj.dvPlanifies)} sub={`soit ${proj.perWeek.dvPlanifies.toFixed(1)} / sem.`} />
            <StatBox label="Unités à produire" value={fmt(Math.max(0, goalUnits - units))} sub={`soit ${proj.perWeek.units.toFixed(1)} / sem.`} />
            <StatBox label="Clients à signer" value={fmt(proj.clientsToSign)} sub={`soit ${proj.perWeek.clients.toFixed(1)} / sem.`} />
            <StatBox label="Recrues à entrer" value={fmt(Math.max(0, goalRecrues - dossiers))} sub={`soit ${proj.perWeek.recrues.toFixed(1)} / sem.`} />
          </div>
        </div>
      )}
    </div>
  );
}
