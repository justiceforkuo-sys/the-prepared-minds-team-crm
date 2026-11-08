"use client";

import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, ChevronUp, FileText, Plus, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Revenus nets reçus, mois par mois, avec les colonnes choisies par chaque personne (salaire d'un employeur, job étudiant,
// commissions, loyers…). Une case vide marquée « manquant » attend l'extrait de compte. Une fiche de paie peut être lue
// automatiquement : seuls les montants vérifiés sont enregistrés, le fichier n'est jamais conservé.

export interface FicheMontants {
  employeur: string;
  brut: number | null;
  cotisations: number | null;
  precompte: number | null;
  net: number | null;
}
export interface Recu {
  mois: string;
  source: string;
  montant: number | null;
  note: string | null;
  fiche?: FicheMontants | null;
}

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const inputCls = "w-full rounded-md border border-line bg-card-alt px-1.5 py-1 text-right text-xs text-ink outline-none focus:border-gold";
const fieldCls = "rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50";
const eur = (n: number) => n.toLocaleString("fr-BE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
const fmtInput = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

type Draft = { mois: string; source: string; employeur: string; brut: string; cotisations: string; precompte: string; net: string };

export function RecusSection({
  personId,
  recus,
  setRecus,
  sources,
  setSources,
  estim,
  setEstim,
}: {
  personId: string;
  recus: Recu[];
  setRecus: Dispatch<SetStateAction<Recu[]>>;
  sources: string[];
  setSources: Dispatch<SetStateAction<string[]>>;
  /** Colonnes qui comptent dans l'estimation (commissions d'indépendant, pas un salaire). */
  estim: string[];
  setEstim: Dispatch<SetStateAction<string[]>>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(true);
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => [...new Set([currentYear, ...recus.map((r) => Number(r.mois.slice(0, 4)))])].sort((a, b) => b - a), [recus, currentYear]);
  const [year, setYear] = useState(currentYear);
  const [msg, setMsg] = useState<string | null>(null);
  const [newSource, setNewSource] = useState("");
  const [reading, setReading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const get = (mois: string, source: string) => recus.find((r) => r.mois === mois && r.source === source);
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const known = (source: string) => months.reduce((s, m) => s + (get(m, source)?.montant ?? 0), 0);
  const missing = (source: string) => months.filter((m) => get(m, source) && get(m, source)?.montant === null).length;
  const totalYear = sources.reduce((s, src) => s + known(src), 0);
  const fiches = recus.filter((r) => r.mois.startsWith(String(year)) && r.fiche);
  const sumFiche = (k: "brut" | "cotisations" | "precompte" | "net") => fiches.reduce((s, r) => s + (r.fiche?.[k] ?? 0), 0);

  const save = async (mois: string, source: string, raw: string) => {
    const previous = get(mois, source);
    const montant = raw.trim() === "" ? null : num(raw);
    if (montant !== null && !(montant >= 0)) return setMsg("Entre un montant valide (laisse vide si l'extrait manque).");
    if ((previous?.montant ?? null) === montant) return;
    const note = previous?.note ?? null;
    const fiche = previous?.fiche ?? null;
    setRecus((cur) => [...cur.filter((r) => !(r.mois === mois && r.source === source)), { mois, source, montant, note, fiche }]);
    const { error } = await supabase
      .from("finance_revenus_recus")
      .upsert({ person_id: personId, mois, source, montant, note, fiche, updated_at: new Date().toISOString() }, { onConflict: "person_id,mois,source" });
    setMsg(error ? error.message : null);
  };

  const addSource = async () => {
    const nom = newSource.trim();
    if (!nom) return;
    if (sources.some((s) => s.toLowerCase() === nom.toLowerCase())) return setMsg("Cette colonne existe déjà.");
    const { error } = await supabase.from("finance_revenus_sources").insert({ person_id: personId, nom, ordre: sources.length });
    if (error) return setMsg(error.message);
    setSources((cur) => [...cur, nom]);
    setNewSource("");
    setMsg(null);
  };

  const toggleEstim = async (nom: string, on: boolean) => {
    setEstim((cur) => (on ? [...cur, nom] : cur.filter((s) => s !== nom)));
    const { error } = await supabase.from("finance_revenus_sources").update({ independant: on }).eq("nom", nom).eq("person_id", personId);
    if (error) {
      setEstim((cur) => (on ? cur.filter((s) => s !== nom) : [...cur, nom]));
      setMsg(error.message);
    } else setMsg(null);
  };

  const renameSource = async (nom: string) => {
    const next = (prompt(`Nouveau nom pour « ${nom} » :`, nom) ?? "").trim();
    if (!next || next === nom) return;
    if (sources.some((s) => s.toLowerCase() === next.toLowerCase())) return setMsg("Ce nom existe déjà.");
    const a = await supabase.from("finance_revenus_recus").update({ source: next }).eq("source", nom).eq("person_id", personId);
    if (a.error) return setMsg(a.error.message);
    const b = await supabase.from("finance_revenus_sources").update({ nom: next }).eq("nom", nom).eq("person_id", personId);
    if (b.error) return setMsg(b.error.message);
    setSources((cur) => cur.map((s) => (s === nom ? next : s)));
    setEstim((cur) => cur.map((s) => (s === nom ? next : s)));
    setRecus((cur) => cur.map((r) => (r.source === nom ? { ...r, source: next } : r)));
    setMsg(null);
  };

  const removeSource = async (nom: string) => {
    const n = recus.filter((r) => r.source === nom && r.montant !== null).length;
    if (!confirm(`Supprimer la colonne « ${nom} »${n ? ` et ses ${n} montant${n > 1 ? "s" : ""} saisi${n > 1 ? "s" : ""}` : ""} ?`)) return;
    const a = await supabase.from("finance_revenus_recus").delete().eq("source", nom).eq("person_id", personId);
    if (a.error) return setMsg(a.error.message);
    const b = await supabase.from("finance_revenus_sources").delete().eq("nom", nom).eq("person_id", personId);
    if (b.error) return setMsg(b.error.message);
    setSources((cur) => cur.filter((s) => s !== nom));
    setEstim((cur) => cur.filter((s) => s !== nom));
    setRecus((cur) => cur.filter((r) => r.source !== nom));
  };

  const readFiche = async (file: File) => {
    setReading(true);
    setMsg(null);
    try {
      const body = new FormData();
      body.set("fiche", file);
      const res = await fetch("/api/finances/fiche-de-paie", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fiche?: { employeur: string; periode: string | null; brut: number | null; cotisations: number | null; precompte: number | null; net: number | null } };
      if (!res.ok || !json.fiche) return setMsg(json.error ?? "La lecture a échoué : saisis les montants à la main.");
      const f = json.fiche;
      // Par défaut : la colonne qui ressemble à un salaire, sinon la première
      const guess = sources.find((s) => /salaire|paie|g4s|job|employeur/i.test(s)) ?? sources[0] ?? "Salaire";
      setDraft({
        mois: f.periode ?? `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
        source: guess,
        employeur: f.employeur,
        brut: fmtInput(f.brut),
        cotisations: fmtInput(f.cotisations),
        precompte: fmtInput(f.precompte),
        net: fmtInput(f.net),
      });
    } catch {
      setMsg("La lecture a échoué : saisis les montants à la main.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    const parse = (v: string) => (v.trim() === "" ? null : num(v));
    const net = parse(draft.net);
    if (net === null || !(net >= 0)) return setMsg("Le net à payer est obligatoire.");
    const fiche: FicheMontants = { employeur: draft.employeur.trim(), brut: parse(draft.brut), cotisations: parse(draft.cotisations), precompte: parse(draft.precompte), net };
    const source = draft.source.trim();
    if (!source || !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.mois)) return setMsg("Choisis un mois et une colonne.");
    if (!sources.includes(source)) {
      const { error } = await supabase.from("finance_revenus_sources").insert({ person_id: personId, nom: source, ordre: sources.length });
      if (error) return setMsg(error.message);
      setSources((cur) => [...cur, source]);
    }
    const previous = get(draft.mois, source);
    const note = previous?.note ?? (fiche.employeur ? `Fiche de paie ${fiche.employeur}` : "Fiche de paie");
    const { error } = await supabase
      .from("finance_revenus_recus")
      .upsert({ person_id: personId, mois: draft.mois, source, montant: net, note, fiche, updated_at: new Date().toISOString() }, { onConflict: "person_id,mois,source" });
    if (error) return setMsg(error.message);
    setRecus((cur) => [...cur.filter((r) => !(r.mois === draft.mois && r.source === source)), { mois: draft.mois, source, montant: net, note, fiche }]);
    setYear(Number(draft.mois.slice(0, 4)));
    setDraft(null);
    setMsg("Fiche enregistrée.");
  };

  const draftField = (key: keyof Draft, label: string, props: Record<string, string> = {}) => (
    <label className="text-muted">
      {label}
      <input value={draft?.[key] ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))} className={`${fieldCls} mt-0.5 w-full`} {...props} />
    </label>
  );

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

          {sources.length === 0 ? (
            <div className="mt-3 rounded-xl border border-line bg-card-alt p-3 text-xs text-muted">
              Aucune colonne pour l&apos;instant. Ajoute les sources de tes revenus ci-dessous (par exemple « Salaire », « Commissions OVB », « Job étudiant », « Loyers »), puis note ce que tu reçois chaque mois.
            </div>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {sources.map((s) => (
                  <div key={s} className="rounded-xl bg-card-alt p-2.5">
                    <div className="truncate text-[10px] font-bold uppercase text-muted">
                      {s} {year}
                    </div>
                    <div className="font-serif text-lg font-semibold text-ink">{eur(known(s))}</div>
                    {missing(s) > 0 && <div className="text-[10px] text-muted">{missing(s)} mois sans extrait : total incomplet</div>}
                  </div>
                ))}
                {sources.length > 1 && (
                  <div className="rounded-xl bg-card-alt p-2.5">
                    <div className="text-[10px] font-bold uppercase text-muted">Total reçu {year}</div>
                    <div className="font-serif text-lg font-semibold text-gold-light">{eur(totalYear)}</div>
                  </div>
                )}
              </div>

              {fiches.length > 0 && (
                <div className="mt-2 rounded-xl border border-line bg-card-alt p-2.5 text-xs">
                  <div className="text-[10px] font-bold uppercase text-muted">
                    Fiches de paie lues en {year} ({fiches.length})
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-ink">
                    <span className="text-muted">Brut</span>
                    <span className="text-right font-bold">{eur(sumFiche("brut"))}</span>
                    <span className="text-muted">Cotisations sociales retenues</span>
                    <span className="text-right font-bold">{eur(sumFiche("cotisations"))}</span>
                    <span className="text-muted">Précompte professionnel déjà retenu</span>
                    <span className="text-right font-bold">{eur(sumFiche("precompte"))}</span>
                    <span className="text-muted">Net payé</span>
                    <span className="text-right font-bold">{eur(sumFiche("net"))}</span>
                  </div>
                </div>
              )}

              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-xs" style={{ minWidth: 120 + sources.length * 110 }}>
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-muted">
                      <th className="py-1 pr-2">Mois</th>
                      {sources.map((s) => (
                        <th key={s} className="px-1 py-1 text-right">
                          <span className="inline-flex items-center justify-end gap-1">
                            <button onClick={() => renameSource(s)} className="max-w-[110px] truncate hover:text-ink" title="Renommer cette colonne">
                              {s}
                            </button>
                            <button onClick={() => removeSource(s)} className="text-muted hover:text-red" aria-label={`Supprimer la colonne ${s}`}>
                              <X size={11} />
                            </button>
                          </span>
                          <label className="mt-0.5 flex cursor-pointer items-center justify-end gap-1 text-[9px] font-normal normal-case tracking-normal" title="Coche les commissions d'indépendant ; laisse décoché un salaire d'employeur.">
                            <input type="checkbox" checked={estim.includes(s)} onChange={(e) => void toggleEstim(s, e.target.checked)} />
                            compte dans l&apos;estimation
                          </label>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, i) => (
                      <tr key={m} className="border-t border-line align-top">
                        <td className="py-1 pr-2 text-ink">{MOIS[i]}</td>
                        {sources.map((s) => {
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
            </>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <input value={newSource} onChange={(e) => setNewSource(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void addSource()} placeholder="Nouvelle colonne (ex. Salaire, Loyers)" className={`${fieldCls} min-w-[180px] flex-1`} />
            <button onClick={addSource} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink">
              <Plus size={13} /> Ajouter une colonne
            </button>
          </div>

          <div className="mt-2">
            <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && void readFiche(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={reading} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink disabled:opacity-50">
              <FileText size={13} /> {reading ? "Lecture de la fiche…" : "Lire une fiche de paie (PDF ou photo)"}
            </button>
            <div className="mt-1 text-[11px] text-muted">La fiche est lue par Claude puis oubliée : elle n&apos;est pas conservée dans le CRM, seuls les montants que tu valides sont enregistrés. Vérifie-les avant d&apos;enregistrer.</div>
          </div>

          {draft && (
            <div className="mt-3 grid gap-2 rounded-xl border border-gold bg-card-alt p-2.5 text-xs sm:grid-cols-2">
              <div className="font-bold text-ink sm:col-span-2">Montants lus : vérifie et corrige si besoin</div>
              {draftField("employeur", "Employeur")}
              <label className="text-muted">
                Mois où l&apos;argent est reçu
                <input type="month" value={draft.mois} onChange={(e) => setDraft({ ...draft, mois: e.target.value })} className={`${fieldCls} mt-0.5 w-full`} />
              </label>
              {draftField("brut", "Brut (€)", { inputMode: "decimal" })}
              {draftField("cotisations", "Cotisations sociales retenues (€)", { inputMode: "decimal" })}
              {draftField("precompte", "Précompte professionnel (€)", { inputMode: "decimal" })}
              {draftField("net", "Net à payer (€)", { inputMode: "decimal" })}
              <label className="text-muted sm:col-span-2">
                Colonne du tableau
                <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} className={`${fieldCls} mt-0.5 w-full`}>
                  {(sources.length ? sources : ["Salaire"]).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button onClick={saveDraft} className={goldBtn}>
                  Enregistrer
                </button>
                <button onClick={() => setDraft(null)} className="rounded-md border border-line px-3 py-1.5 text-xs text-ink">
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 text-[11px] text-muted">
            Montants nets reçus sur tes comptes. Pour la déclaration d&apos;impôt, utilise les fiches officielles (fiche 281.10 de l&apos;employeur, fiche fiscale de ta société), pas ces montants. Une case marquée « manquant » attend l&apos;extrait de compte correspondant.
          </div>
          {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
        </>
      )}
    </div>
  );
}
