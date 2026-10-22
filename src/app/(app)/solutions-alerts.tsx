import Link from "next/link";
import { Library } from "lucide-react";
import { REVIEW_LABEL, type ReviewReason } from "@/lib/solutions";

// Admin et responsables des fiches : fiches non vérifiées depuis 12 mois, ou dont un document a été déposé depuis la dernière vérification
export function SolutionsAlerts({ items }: { items: { id: string; nom: string; reason: ReviewReason }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 rounded-2xl border border-gold bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
          <Library size={13} /> Fiches solutions à revérifier
          <span className="rounded-full border border-gold px-1.5 text-[10px] text-gold-light">{items.length}</span>
        </div>
        <Link href="/solutions" className="text-xs text-gold-light">
          Ouvrir
        </Link>
      </div>
      <div className="flex flex-col gap-1">
        {items.slice(0, 6).map((i) => (
          <Link key={i.id} href={`/solutions/${i.id}`} className="text-xs text-ink">
            <strong>{i.nom}</strong> <span className="text-muted">— {REVIEW_LABEL[i.reason]}</span>
          </Link>
        ))}
        {items.length > 6 && <div className="text-[11px] text-muted">… et {items.length - 6} autre(s).</div>}
      </div>
    </div>
  );
}
