import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { eur } from "@/lib/remuneration";

// Admin : un collaborateur a obtenu son agrément FSMA, son rattrapage est calculé et reste à verser
export function RattrapageAlerts({ items }: { items: { name: string; montant: number }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 rounded-2xl border border-gold bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          <PiggyBank size={13} /> Rattrapages à verser
          <span className="rounded-full border border-gold px-1.5 text-[10px] text-gold-light">{items.length}</span>
        </div>
        <Link href="/admin" className="text-xs text-gold-light">
          Ouvrir
        </Link>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((r) => (
          <div key={r.name} className="text-xs font-bold text-ink">
            Rattrapage à verser à {r.name} : {eur(r.montant)}
          </div>
        ))}
      </div>
    </div>
  );
}
