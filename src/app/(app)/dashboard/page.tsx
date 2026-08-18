import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { fmtEUR } from "@/lib/format";
import type { ProspectStage } from "@/types/database";

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
  const [{ count: clientsCount }, { data: prospects }, { count: downlineCount }, { data: team }, { data: payouts }] =
    await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("owner_id", person.id),
      supabase.from("prospects").select("stage").eq("owner_id", person.id),
      supabase.from("people").select("*", { count: "exact", head: true }).eq("reports_to", person.id),
      supabase.from("people").select("id, name, personal_pts").eq("active", true).order("personal_pts", { ascending: false }),
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

  const ranking = team ?? [];
  const position = ranking.findIndex((t) => t.id === person.id) + 1;
  const top3 = ranking.slice(0, 3);
  const showOwnRow = position > 3;

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
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            Classement (points perso)
          </div>
          {position === 0 ? (
            <div className="text-sm text-muted">Pas encore de points enregistrés.</div>
          ) : (
            <>
              <div className="mb-2 font-serif text-2xl font-semibold text-gold-light">
                #{position} <span className="text-sm text-muted">sur {ranking.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                {top3.map((t, i) => (
                  <div
                    key={t.id}
                    className={`flex justify-between text-xs ${
                      t.id === person.id ? "font-bold text-gold-light" : "text-muted"
                    }`}
                  >
                    <span>
                      {i + 1}. {t.name}
                    </span>
                    <span>{t.personal_pts} pts</span>
                  </div>
                ))}
                {showOwnRow && (
                  <div className="flex justify-between text-xs font-bold text-gold-light">
                    <span>
                      {position}. {person.name}
                    </span>
                    <span>{person.personal_pts} pts</span>
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
    </div>
  );
}
