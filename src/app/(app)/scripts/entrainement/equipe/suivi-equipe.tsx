"use client";

import { useMemo, useState } from "react";
import type { SeanceLigne } from "../actions";
import { fmtSeanceDate, noteColor } from "@/lib/entrainement-format";
import { SeancesListe } from "../seances-liste";

export interface SuiviPersonne {
  id: string;
  name: string;
  seances: SeanceLigne[]; // plus récentes d'abord
}

const moy = (l: SeanceLigne[]) => (l.length ? Math.round((l.reduce((s, x) => s + x.note, 0) / l.length) * 10) / 10 : null);

type Tri = "relancer" | "moyenne" | "nom";

/** Tableau de suivi : une ligne par collaborateur (nombre de séances, moyenne, dernière note, tendance) ; clic pour relire ses séances. */
export function SuiviEquipe({ personnes }: { personnes: SuiviPersonne[] }) {
  const [tri, setTri] = useState<Tri>("relancer");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const lignes = useMemo(() => {
    const l = personnes.map((p) => {
      const dernieres = p.seances.slice(0, 3);
      const premieres = p.seances.slice(-3);
      const tendance = p.seances.length >= 4 ? Math.round(((moy(dernieres) ?? 0) - (moy(premieres) ?? 0)) * 10) / 10 : null;
      return { ...p, n: p.seances.length, moyenne: moy(p.seances), derniere: p.seances[0] ?? null, tendance };
    });
    if (tri === "nom") return l.sort((a, b) => a.name.localeCompare(b.name));
    if (tri === "moyenne") return l.sort((a, b) => (a.moyenne ?? -1) - (b.moyenne ?? -1) || a.name.localeCompare(b.name));
    // À relancer : ceux qui n'ont jamais pratiqué d'abord, puis les entraînements les plus anciens
    return l.sort((a, b) => (a.derniere ? new Date(a.derniere.created_at).getTime() : 0) - (b.derniere ? new Date(b.derniere.created_at).getTime() : 0) || a.name.localeCompare(b.name));
  }, [personnes, tri]);

  const pratiquants = personnes.filter((p) => p.seances.length > 0).length;
  const toutes = personnes.flatMap((p) => p.seances);
  const moyenneEquipe = moy(toutes);

  return (
    <div>
      <p className="mb-3 mt-1 text-xs text-muted">
        {pratiquants} collaborateur{pratiquants > 1 ? "s" : ""} sur {personnes.length} {pratiquants > 1 ? "se sont" : "s'est"} entraîné{pratiquants > 1 ? "s" : ""}
        {moyenneEquipe !== null && (
          <>
            {" "}· moyenne de l&apos;équipe <strong style={{ color: noteColor(moyenneEquipe) }}>{moyenneEquipe}/10</strong> sur {toutes.length} séance{toutes.length > 1 ? "s" : ""}
          </>
        )}
        . Clique sur une personne pour relire ses séances.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">Trier :</span>
        {([["relancer", "À relancer d'abord"], ["moyenne", "Moyenne la plus basse"], ["nom", "Nom"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTri(id)} className={`rounded-lg border px-3 py-1.5 font-bold ${tri === id ? "border-gold bg-line text-gold-light" : "border-line bg-card-alt text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {lignes.map((p) => (
          <div key={p.id} className="rounded-2xl border border-line bg-card p-3">
            <button onClick={() => setOuvert(ouvert === p.id ? null : p.id)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{p.name}</span>
                <span className="text-xs text-muted">
                  {p.n === 0 ? "Pas encore d'entraînement" : `${p.n} séance${p.n > 1 ? "s" : ""} · dernière le ${fmtSeanceDate(p.derniere!.created_at)}`}
                </span>
              </span>
              {p.n > 0 && (
                <span className="flex items-center gap-3 text-xs">
                  <span className="text-muted">
                    moyenne <strong style={{ color: noteColor(p.moyenne ?? 0) }}>{p.moyenne}/10</strong>
                  </span>
                  <span className="text-muted">
                    dernière <strong style={{ color: noteColor(p.derniere!.note) }}>{p.derniere!.note}/10</strong>
                  </span>
                  {p.tendance !== null && (
                    <span className="font-bold" style={{ color: p.tendance > 0 ? "#1f8158" : p.tendance < 0 ? "#b3543a" : "var(--color-muted)" }}>
                      {p.tendance > 0 ? "▲ +" : p.tendance < 0 ? "▼ " : "= "}
                      {p.tendance}
                    </span>
                  )}
                </span>
              )}
            </button>
            {ouvert === p.id && p.n > 0 && (
              <div className="mt-2">
                <SeancesListe lignes={p.seances} />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">La tendance compare la moyenne des 3 dernières séances à celle des 3 premières (à partir de 4 séances).</p>
    </div>
  );
}
