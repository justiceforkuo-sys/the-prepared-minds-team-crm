"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { FormationModuleData } from "@/lib/formation-modules";
import type { Rank } from "@/types/database";

interface PersonInfo {
  name: string;
  rank: Rank;
  phone: string | null;
  email: string | null;
}

export function FormationSlideshow({
  personId,
  person,
  module,
  initialDone,
}: {
  personId: string;
  person: PersonInfo;
  module: FormationModuleData;
  initialDone: boolean;
}) {
  const supabase = createClient();
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(initialDone);

  const slides = useMemo(() => {
    if (!module.personalizedFirstSlide) return module.slides;
    const introSlide = [
      "Let me introduce myself",
      person.name,
      person.rank,
      person.phone ?? "",
      person.email ?? "",
    ].filter(Boolean);
    return [introSlide, ...module.slides];
  }, [module, person]);

  const total = slides.length;
  const lines = slides[index] ?? [];

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(total - 1, i)));

  const toggleDone = async () => {
    const next = !done;
    setDone(next);
    await supabase.from("formation_progress").upsert(
      {
        person_id: personId,
        module_id: module.id,
        done: next,
        done_date: next ? new Date().toISOString().slice(0, 10) : null,
      },
      { onConflict: "person_id,module_id" }
    );
  };

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <Link href="/formation" className="flex items-center gap-1.5 text-sm text-muted">
          <ArrowLeft size={16} /> Formation
        </Link>
        <button
          onClick={toggleDone}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
            done ? "border-green text-green" : "border-line text-muted"
          }`}
        >
          {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          {done ? "Terminé" : "Marquer comme terminé"}
        </button>
      </div>

      <h2 className="font-serif text-lg font-semibold text-ink">{module.title}</h2>
      <div className="mt-1 mb-3 text-xs text-muted">
        Diapositive {index + 1} / {total}
      </div>
      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-card-alt">
        <div
          className="h-full rounded-full bg-gold"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div className="min-h-[280px] rounded-2xl border border-line bg-card p-5">
        <div className="flex flex-col gap-2.5">
          {lines.map((line, i) => (
            <div
              key={i}
              className={i === 0 ? "font-serif text-lg font-semibold text-gold-light" : "text-sm text-ink"}
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-sm text-ink disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Précédent
        </button>
        <button
          onClick={() => goTo(index + 1)}
          disabled={index === total - 1}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-night disabled:opacity-40"
        >
          Suivant <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
