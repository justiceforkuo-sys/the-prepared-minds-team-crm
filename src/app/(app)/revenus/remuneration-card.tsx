import { RattrapageReserve } from "@/components/rattrapage-reserve";
import { eur, rankLabel, tierInfo, type RemuSummary } from "@/lib/remuneration";
import { fmtDate } from "@/lib/format";

/** Ma rémunération de démarrage (collaborateurs démarrés à partir du 1er septembre 2025). */
export function RemunerationCard({
  summary,
  rank,
  pointValue,
  agrementAt,
  unitsThisMonth,
  unitsTotal,
}: {
  summary: RemuSummary;
  rank: string;
  pointValue: number;
  agrementAt: string | null;
  unitsThisMonth: number;
  unitsTotal: number;
}) {
  const agreed = !!agrementAt;
  const count = summary.clientsCount;
  const tier = tierInfo(count, summary.bareme);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Ma rémunération de démarrage</div>
          <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] font-bold text-gold-light">
            {agreed ? `Sous-agent OVB Willemot · depuis le ${new Date(agrementAt!).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}` : "Apporteur d'affaires · avant l'agrément FSMA"}
          </span>
        </div>
        <p className="mb-3 text-xs text-muted">
          {agreed
            ? "Chaque nouveau contrat est payé en unités × valeur du point de ton rang à la souscription."
            : "Un forfait par client, selon un barème progressif. Tes unités sont déjà calculées et mises de côté : elles te sont versées sous forme de rattrapage à ton agrément FSMA."}
        </p>

        {!agreed && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-serif text-2xl font-semibold text-gold-light">{count}</div>
                <div className="text-xs text-muted">Mes clients</div>
              </div>
              <div>
                <div className="font-serif text-2xl font-semibold text-gold-light">{eur(summary.forfaitsTotal)}</div>
                <div className="text-xs text-muted">Mes forfaits (apporteur){summary.forfaitsPayes > 0 ? ` · ${eur(summary.forfaitsPayes)} déjà payés` : ""}</div>
              </div>
            </div>
            <div className="mt-3 border-t border-line pt-2.5 text-xs text-muted">
              Prochain client = <strong className="text-ink">{eur(tier.nextAmount)}</strong>
              {tier.remainingAtAmount !== null && tier.nextTierAmount !== null && (
                <>
                  {" "}
                  · plus que <strong className="text-ink">{tier.remainingAtAmount}</strong> client{tier.remainingAtAmount > 1 ? "s" : ""} avant le palier à{" "}
                  <strong className="text-ink">{eur(tier.nextTierAmount)}</strong>
                </>
              )}
            </div>
            {summary.forfaits.length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-gold-light">Détail des forfaits par client</summary>
                <div className="mt-2 flex flex-col gap-1">
                  {summary.forfaits.map((f) => (
                    <div key={f.client_id} className="flex justify-between gap-2">
                      <span className="text-ink">
                        n°{f.rang_client} · {f.client_name ?? "Client"} <span className="text-muted">({fmtDate(f.signe_le)})</span>
                      </span>
                      <span className="text-muted">
                        {eur(f.montant)}
                        {f.paye_le ? ` · payé le ${fmtDate(f.paye_le)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        <div className={`${agreed ? "" : "mt-3 border-t border-line pt-2.5 "}grid grid-cols-2 gap-3`}>
          <div>
            <div className="font-serif text-xl font-semibold text-ink">{Math.round(unitsThisMonth)}</div>
            <div className="text-xs text-muted">
              Unités du mois (compteur OVB) · {eur(unitsThisMonth * pointValue)} {agreed ? "payés" : "mis de côté"} à {eur(pointValue)} le point
            </div>
          </div>
          <div>
            <div className="font-serif text-xl font-semibold text-ink">{Math.round(unitsTotal)}</div>
            <div className="text-xs text-muted">Unités cumulées depuis le démarrage · rang {rankLabel(rank)}</div>
          </div>
        </div>
        {agreed && summary.unitsPaidValue > 0 && (
          <div className="mt-2 text-xs text-muted">
            Valeur des unités payées depuis l&apos;agrément : <strong className="text-ink">{eur(summary.unitsPaidValue)}</strong>
          </div>
        )}
      </div>

      <RattrapageReserve summary={summary} agreed={agreed} />
    </div>
  );
}
