import { fmtEUR } from "@/lib/format";
import { feeForClientNumber, totalApporteurFee } from "@/lib/apporteur-fee";

export function ApporteurFeeCard({ clientCount }: { clientCount: number }) {
  const currentTierFee = clientCount > 0 ? feeForClientNumber(clientCount) : null;
  const totalEarned = totalApporteurFee(clientCount);

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        Ma rémunération (apporteur)
      </div>
      <p className="mb-3 text-xs text-muted">
        Forfait par client apporté, selon le contrat d&apos;apporteur — pas le système
        d&apos;unités/rang.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="font-serif text-2xl font-semibold text-gold-light">{clientCount}</div>
          <div className="text-xs text-muted">Clients apportés au total</div>
        </div>
        <div>
          <div className="font-serif text-2xl font-semibold text-gold-light">{fmtEUR(totalEarned)}</div>
          <div className="text-xs text-muted">Forfait total gagné</div>
        </div>
      </div>
      {currentTierFee !== null && (
        <div className="mt-3 border-t border-line pt-2.5 text-xs text-muted">
          Palier actuel : <strong className="text-ink">{fmtEUR(currentTierFee)}</strong> par nouveau client
        </div>
      )}
    </div>
  );
}
