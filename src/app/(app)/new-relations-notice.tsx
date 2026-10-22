import Link from "next/link";
import { UserPlus } from "lucide-react";

// Voie 1 du bloc 7 : nouvelles relations arrivées par email depuis hier, à accueillir avec le message 1
export function NewRelationsNotice({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Link href="/linkedin" className="mb-3 flex items-center gap-2 rounded-2xl border border-gold bg-card p-3.5 text-sm text-ink">
      <UserPlus size={18} className="flex-shrink-0 text-gold" />
      <span>
        <strong>
          {count} nouvelle{count > 1 ? "s" : ""} relation{count > 1 ? "s" : ""} LinkedIn
        </strong>{" "}
        depuis hier : à accueillir avec le message 1.
      </span>
    </Link>
  );
}
