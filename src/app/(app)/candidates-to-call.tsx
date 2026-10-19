import Link from "next/link";
import { UserPlus } from "lucide-react";

export interface CallbackCandidate {
  id: string;
  name: string;
  status: string;
  reason: string;
  urgent: boolean;
}

// Candidats dont tu es responsable et qui attendent un contact (règle d'or : 24 à 48 h)
export function CandidatesToCall({ items }: { items: CallbackCandidate[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          <UserPlus size={13} /> Candidats à rappeler
          <span className="rounded-full border border-red px-1.5 text-[10px] text-red">{items.length}</span>
        </div>
        <Link href="/recrutement" className="text-xs text-gold-light">
          Ouvrir
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {items.slice(0, 8).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <div className="truncate text-ink">{c.name}</div>
              <div className="truncate text-[11px] text-muted">{c.status}</div>
            </div>
            <span className={`flex-shrink-0 font-bold ${c.urgent ? "text-red" : "text-[#e08a3a]"}`}>{c.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
