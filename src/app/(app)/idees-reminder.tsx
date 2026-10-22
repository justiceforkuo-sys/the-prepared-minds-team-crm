import Link from "next/link";
import { Lightbulb } from "lucide-react";

// Rappel hebdomadaire (cycle de la superconscience) : décider des idées restées sans action.
// Affiché le vendredi, ou dès que 8 idées ou plus s'accumulent.
export function IdeesReminder({ count, isFriday }: { count: number; isFriday: boolean }) {
  if (count <= 0 || !(isFriday || count >= 8)) return null;
  return (
    <Link href="/idees" className="mb-3 flex items-center gap-2 rounded-2xl border border-gold bg-card p-3.5 text-sm text-ink">
      <Lightbulb size={18} className="flex-shrink-0 text-gold" />
      <span>
        Tu as <strong>{count} idée{count > 1 ? "s" : ""} non traitée{count > 1 ? "s" : ""}</strong>. 10 minutes pour décider ?
      </span>
    </Link>
  );
}
