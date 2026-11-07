"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Circle, FileText } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { FormationModuleData } from "@/lib/formation-modules";
import type { Rank } from "@/types/database";
import { MediaAdmin } from "./media-admin";

interface PersonInfo {
  name: string;
  rank: Rank;
  phone: string | null;
  email: string | null;
}

export interface ModuleMedia {
  id: string;
  kind: "video" | "pdf";
  title: string;
  url: string;
  sizeBytes: number | null;
}

/** Part de la vidéo à voir pour valider automatiquement le module. */
const AUTO_DONE_RATIO = 0.9;

export function FormationSlideshow({
  personId,
  person,
  module,
  initialDone,
  media,
  isAdmin,
}: {
  personId: string;
  person: PersonInfo;
  module: FormationModuleData;
  initialDone: boolean;
  media: ModuleMedia[];
  isAdmin: boolean;
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

  const toggleDone = () => saveDone(!done);

  const saveDone = async (next: boolean) => {
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

      {media.some((m) => m.kind === "video") && <div className="mt-1 mb-1 text-xs text-muted">Le module est validé automatiquement quand tu as vu {Math.round(AUTO_DONE_RATIO * 100)} % de la vidéo.</div>}
      {media
        .filter((m) => m.kind === "video")
        .map((m) => (
          <div key={m.id} className="mt-2 mb-3 overflow-hidden rounded-2xl border border-line bg-black">
            <video
              controls
              playsInline
              preload="metadata"
              src={m.url}
              className="aspect-video w-full"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (!done && v.duration > 0 && v.currentTime / v.duration >= AUTO_DONE_RATIO) void saveDone(true);
              }}
            >
              Ton navigateur ne peut pas lire cette vidéo.
            </video>
          </div>
        ))}
      {media
        .filter((m) => m.kind === "pdf")
        .map((m) => (
          <a
            key={m.id}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex items-center gap-2.5 rounded-2xl border border-line bg-card p-3.5 text-sm font-bold text-ink"
          >
            <FileText size={18} className="flex-shrink-0 text-gold" />
            <span className="min-w-0 flex-1 truncate">{m.title}</span>
            <span className="text-xs font-normal text-muted">PDF{m.sizeBytes ? ` · ${(m.sizeBytes / 1048576).toFixed(1).replace(".", ",")} Mo` : ""}</span>
          </a>
        ))}

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

      {isAdmin && <MediaAdmin moduleId={module.id} media={media} />}
    </div>
  );
}
