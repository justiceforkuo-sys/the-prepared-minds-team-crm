import { PiggyBank } from "lucide-react";
import { eur, type RemuSummary } from "@/lib/remuneration";
import { fmtDate } from "@/lib/format";

/**
 * Réserve de rattrapage : la motivation à obtenir l'agrément FSMA vite.
 * Avant l'agrément : montant estimé (valeur des unités mises de côté − forfaits clients), versé à l'agrément.
 * Après : le rattrapage calculé, et sa date de versement.
 */
export function RattrapageReserve({ summary, agreed }: { summary: RemuSummary; agreed: boolean }) {
  const r = summary.rattrapage;
  if (agreed || r) {
    if (!r) return null;
    return (
      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          <PiggyBank size={13} /> Rattrapage
        </div>
        <div className="font-serif text-2xl font-semibold text-gold-light">{eur(r.montant)}</div>
        <div className="mt-1 text-xs text-ink">
          {r.verse_le ? (
            <>
              Rattrapage versé le {new Date(r.verse_le).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })} : <strong>{eur(r.montant)}</strong>
            </>
          ) : (
            <>Calculé à ton agrément FSMA ({fmtDate(r.calcule_le)}) : en attente de versement.</>
          )}
        </div>
        <div className="mt-1 text-[11px] text-muted">
          Valeur de tes unités {eur(r.valeur_unites)} − forfaits clients {eur(r.forfaits_payes)}. Si les forfaits dépassent la valeur des unités, le rattrapage est de 0 € et rien n&apos;est repris.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-gold bg-card p-3.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        <PiggyBank size={13} /> Ma réserve de rattrapage
      </div>
      <div className="font-serif text-3xl font-semibold text-gold-light">{eur(summary.rattrapageEstime)}</div>
      <div className="mt-1 text-sm font-bold text-ink">Versée à ton agrément FSMA</div>
      <div className="mt-1 text-[11px] text-muted">
        Valeur de tes unités mises de côté : {eur(summary.reserve)} − forfaits clients : {eur(summary.forfaitsTotal)}. Estimation : le montant exact est calculé à la date d&apos;agrément.
      </div>
    </div>
  );
}
