import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { FORMATION_MODULES } from "@/lib/formation-modules";

export default async function FormationPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const { data: progress } = await supabase
    .from("formation_progress")
    .select("module_id, done")
    .eq("person_id", person.id);

  const doneIds = new Set((progress ?? []).filter((p) => p.done).map((p) => p.module_id));
  const doneCount = FORMATION_MODULES.filter((m) => doneIds.has(m.id)).length;

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Formation</h2>
      <div className="mt-1 mb-4 text-xs text-muted">
        {doneCount}/{FORMATION_MODULES.length} modules terminés
      </div>

      <div className="flex flex-col gap-2">
        {FORMATION_MODULES.map((m, i) => {
          const done = doneIds.has(m.id);
          return (
            <Link
              key={m.id}
              href={`/formation/${m.id}`}
              className="flex items-center gap-2.5 rounded-2xl border border-line bg-card p-3.5"
            >
              {done ? (
                <CheckCircle2 size={20} className="flex-shrink-0 text-green" />
              ) : (
                <Circle size={20} className="flex-shrink-0 text-[#c3cddc]" />
              )}
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted">Module {i + 1}</div>
                <div className="text-sm font-bold text-ink">{m.title}</div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Ressource — Cahier d&apos;analyse</div>
        <p className="text-sm text-muted">
          L&apos;outil eADVICE utilisé en rendez-vous client pour structurer l&apos;analyse (situation familiale,
          professionnelle, épargne) présentée au Module 7. Demande-le à ton sponsor ou ton coach.
        </p>
      </div>
    </div>
  );
}
