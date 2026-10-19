import Link from "next/link";
import { Siren } from "lucide-react";
import type { Alert } from "@/lib/parcours";

// Alertes de décrochage des nouveaux collaborateurs (visibles par leur mentor et l'admin)
export function ParcoursAlerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  const sorted = [...alerts].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "rouge" ? -1 : 1));
  return (
    <div className="mb-3 rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          <Siren size={13} /> Nouveaux collaborateurs : alertes
          <span className="rounded-full border border-red px-1.5 text-[10px] text-red">{alerts.length}</span>
        </div>
        <Link href="/onboarding" className="text-xs text-gold-light">
          Ouvrir
        </Link>
      </div>
      <div className="flex flex-col gap-1.5">
        {sorted.slice(0, 8).map((a, i) => (
          <div key={i} className={`text-xs ${a.severity === "rouge" ? "font-bold text-red" : "text-[#e08a3a]"}`}>
            {a.severity === "rouge" ? "🔴" : "🟠"} {a.text}
          </div>
        ))}
        {sorted.length > 8 && <div className="text-[11px] text-muted">… et {sorted.length - 8} autre(s) dans Onboarding.</div>}
      </div>
    </div>
  );
}
