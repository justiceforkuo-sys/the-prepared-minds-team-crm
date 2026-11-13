"use client";

import { useState, useTransition } from "react";
import { ouvrirSeance, type SeanceDetail, type SeanceLigne } from "./actions";

const SCORE_COLOR = { 0: "#b3543a", 1: "#c99a3f", 2: "#1f8158" } as const;
const SCORE_LABEL = { 0: "À retravailler", 1: "En partie", 2: "Bien" } as const;

export function noteColor(n: number) {
  return n >= 8 ? "#1f8158" : n >= 5 ? "#c99a3f" : "#b3543a";
}

export function fmtSeanceDate(iso: string) {
  return new Date(iso).toLocaleString("fr-BE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
}

function Detail({ s }: { s: SeanceDetail }) {
  const r = s.retour;
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2 text-xs">
      <div className="flex flex-wrap gap-1.5">
        {r.criteres.map((c) => (
          <span
            key={c.id}
            title={c.commentaire}
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
            style={c.score === null ? { borderColor: "var(--color-line)", color: "var(--color-muted)" } : { borderColor: SCORE_COLOR[c.score], color: SCORE_COLOR[c.score] }}
          >
            {c.label} · {c.score === null ? "non atteint" : SCORE_LABEL[c.score]}
          </span>
        ))}
      </div>
      {r.motsARisque.length > 0 && <div className="text-ink">Mots à risque employés : <strong>{r.motsARisque.join(", ")}</strong></div>}
      <div>
        <div className="font-bold text-ink">Ce qui a bien marché</div>
        <div className="text-muted">{r.pointFort}</div>
      </div>
      <div>
        <div className="font-bold text-ink">Un point à améliorer</div>
        <div className="text-muted">{r.pointAAmeliorer}</div>
        {r.exemple && <div className="mt-1 rounded-lg bg-card-alt p-2 italic text-muted">{r.exemple}</div>}
      </div>
      <div>
        <div className="mb-1 font-bold text-ink">La conversation</div>
        <div className="flex flex-col gap-1.5">
          {s.echanges.map((e, i) => (
            <div key={i} className={`max-w-[88%] rounded-2xl px-3 py-1.5 ${e.role === "collab" ? "self-end bg-gold text-night" : "self-start border border-line bg-card-alt text-ink"}`}>
              <div className={`text-[9px] font-bold uppercase tracking-wide ${e.role === "collab" ? "text-night/70" : "text-muted"}`}>{e.role === "collab" ? "Collaborateur" : (s.prenom ?? "Prospect")}</div>
              {e.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Liste de séances ; chaque séance s'ouvre pour montrer la conversation entière et le retour. */
export function SeancesListe({ lignes, montrerNom }: { lignes: SeanceLigne[]; montrerNom?: Record<string, string> }) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, SeanceDetail>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const basculer = (id: string) => {
    if (ouverte === id) return setOuverte(null);
    setOuverte(id);
    if (details[id]) return;
    start(async () => {
      const res = await ouvrirSeance(id);
      if (!res.ok) return setErreur(res.error);
      setErreur(null);
      setDetails((d) => ({ ...d, [id]: res.seance }));
    });
  };

  if (lignes.length === 0) return <div className="rounded-xl border border-line bg-card p-3 text-xs text-muted">Aucune séance pour l&apos;instant.</div>;

  return (
    <div className="flex flex-col gap-1.5">
      {lignes.map((l) => (
        <div key={l.id} className="rounded-xl border border-line bg-card p-2.5 text-xs">
          <button onClick={() => basculer(l.id)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
            <span className="min-w-0">
              <span className="block font-bold text-ink">{l.scenario_titre}</span>
              <span className="text-muted">
                {montrerNom?.[l.person_id] ? `${montrerNom[l.person_id]} · ` : ""}
                {fmtSeanceDate(l.created_at)}
                {l.profil_label ? ` · ${l.profil_label}` : ""}
                {l.rdv_obtenu ? " · RDV fixé" : ""}
              </span>
            </span>
            <span className="font-serif text-lg font-semibold" style={{ color: noteColor(l.note) }}>
              {l.note}/10
            </span>
          </button>
          {ouverte === l.id && (details[l.id] ? <Detail s={details[l.id]} /> : <div className="mt-2 text-muted">{pending ? "Chargement…" : (erreur ?? "")}</div>)}
        </div>
      ))}
    </div>
  );
}
