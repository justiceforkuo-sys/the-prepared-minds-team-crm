"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Historique des virements nets reçus, mois par mois (salaire G4S : avance et solde ; commissions OVB).
// Un montant vide = extrait de compte manquant : il se complète ici dès qu'on a l'extrait.

export interface Recu {
  mois: string;
  source: string;
  montant: number | null;
  note: string | null;
}

export const SOURCES_RECUES = ["G4S avance", "G4S solde", "OVB Willemot"] as const;
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const inputCls = "w-full rounded-md border border-line bg-card-alt px-1.5 py-1 text-right text-xs text-ink outline-none focus:border-gold";
const eur = (n: number) => n.toLocaleString("fr-BE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
const fmtInput = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

export function RecusSection({ personId, initialRecus }: { personId: string; initialRecus: Recu[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [recus, setRecus] = useState(initialRecus);
  const [open, setOpen] = useState(true);
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => [...new Set([currentYear, ...recus.map((r) => Number(r.mois.slice(0, 4)))])].sort((a, b) => b - a), [recus, currentYear]);
  const [year, setYear] = useState(currentYear);
  const [msg, setMsg] = useState<string | null>(null);

  const get = (mois: string, source: string) => recus.find((r) => r.mois === mois && r.source === source);

  const save = async (mois: string, source: string, raw: string) => {
    const previous = get(mois, source);
    const montant = raw.trim() === "" ? null : num(raw);
    if (montant !== null && !(montant >= 0)) return setMsg("Entre un montant valide (laisse vide si l'extrait manque).");
    if ((previous?.montant ?? null) === montant) return;
    const note = previous?.note ?? null;
    setRecus((cur) => [...cur.filter((r) => !(r.mois === mois && r.source === source)), { mois, source, montant, note }]);
    const { error } = await supabase
      .from("finance_revenus_recus")
      .upsert({ person_id: personId, mois, source, montant, note, updated_at: new Date().toISOString() }, { onConflict: "person_id,mois,source" });
    setMsg(error ? error.message : null);
  };

  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const known = (source: string) => months.reduce((s, m) => s + (get(m, source)?.montant ?? 0), 0);
  const missing = (source: string) => months.filter((m) => get(m, source) && get(m, source)?.montant === null).length;
  const totalG4S = known("G4S avance") + known("G4S solde");

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Revenus reçus, mois par mois (nets)</span>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {years.map((y) => (
              <button key={y} onClick={() => setYear(y)} className={`rounded-full border px-3 py-1 text-xs font-bold ${y === year ? "border-gold text-gold-light" : "border-line text-muted"}`}>
                {y}
              </button>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-card-alt p-2.5">
              <div className="text-[10px] font-bold uppercase text-muted">G4S reçu {year}</div>
              <div className="font-serif text-lg font-semibold text-ink">{eur(totalG4S)}</div>
            </div>
            <div className="rounded-xl bg-card-alt p-2.5">
              <div className="text-[10px] font-bold uppercase text-muted">OVB reçu {year}</div>
              <div className="font-serif text-lg font-semibold text-gold-light">{eur(known("OVB Willemot"))}</div>
              {missing("OVB Willemot") > 0 && <div className="text-[10px] text-muted">{missing("OVB Willemot")} mois sans extrait : total incomplet</div>}
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-1 pr-2">Mois</th>
                  {SOURCES_RECUES.map((s) => (
                    <th key={s} className="px-1 py-1 text-right">
                      {s.replace("OVB Willemot", "OVB")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m} className="border-t border-line align-top">
                    <td className="py-1 pr-2 text-ink">{MOIS[i]}</td>
                    {SOURCES_RECUES.map((s) => {
                      const r = get(m, s);
                      return (
                        <td key={s} className="px-1 py-1">
                          <input
                            key={`${m}-${s}-${r?.montant ?? "x"}`}
                            defaultValue={fmtInput(r?.montant ?? null)}
                            placeholder={r ? "manquant" : ""}
                            inputMode="decimal"
                            onBlur={(e) => void save(m, s, e.target.value)}
                            className={inputCls}
                            aria-label={`${s}, ${MOIS[i]} ${year}`}
                          />
                          {r?.note && <div className="mt-0.5 text-[10px] leading-tight text-muted">{r.note}</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[11px] text-muted">
            Montants nets reçus sur tes comptes. Pour la déclaration d&apos;impôt, utilise les fiches officielles (fiche 281.10 de l&apos;employeur, fiche fiscale de ta société), pas ces montants. Une case vide marquée « manquant » attend l&apos;extrait de compte correspondant : complète-la dès que tu l&apos;as.
          </div>
          {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
        </>
      )}
    </div>
  );
}
