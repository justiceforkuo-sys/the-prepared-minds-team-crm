"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Frais professionnels déductibles : une ligne par dépense (table finance_frais), un % d'usage pro par catégorie ET par année
// (table finance_frais_pct). Le montant déductible est toujours recalculé (total × %), jamais saisi à la main.

export interface Frais {
  id: string;
  person_id: string;
  spent_on: string;
  compte: string;
  categorie: string;
  fournisseur: string;
  montant: number;
}
export interface FraisPct {
  annee: number;
  categorie: string;
  pct: number;
  justification: string | null;
}

export const CATEGORIES_FRAIS = [
  "FSMA",
  "Matériel",
  "Logiciels / outils pro",
  "Frais bancaires - compte pro BE95",
  "Formation / événements",
  "Séminaire Marbella",
  "Séminaire Marbella - repas",
  "Voiture - carburant",
  "Voiture - entretien/assurance",
  "Voiture - parking",
  "Télécom",
  "Frais bancaires - comptes privés",
  "Basic-Fit (prospection + forme)",
  "À vérifier",
];
const COMPTES = ["BNP pro BE95", "BNP privé BE23", "Revolut", "Autre"];
const A_VERIFIER = "À vérifier";

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50";

const eur = (n: number) =>
  n.toLocaleString("fr-BE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
const round2 = (n: number) => Math.round(n * 100) / 100;
const todayBrussels = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
const dateFr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });

export function FraisSection({ personId, initialFrais, initialPct }: { personId: string; initialFrais: Frais[]; initialPct: FraisPct[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [today] = useState(todayBrussels);
  const [frais, setFrais] = useState(initialFrais);
  const [pcts, setPcts] = useState(initialPct);
  const currentYear = Number(today.slice(0, 4));
  const years = useMemo(() => {
    const ys = new Set<number>([currentYear, ...frais.map((f) => Number(f.spent_on.slice(0, 4)))]);
    return [...ys].sort((a, b) => b - a);
  }, [frais, currentYear]);
  const [year, setYear] = useState(currentYear);
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: today, compte: COMPTES[0], categorie: CATEGORIES_FRAIS[2], fournisseur: "", montant: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const pctOf = (cat: string) => pcts.find((p) => p.annee === year && p.categorie === cat);

  const rows = useMemo(() => {
    const ofYear = frais.filter((f) => f.spent_on.startsWith(String(year)));
    const cats = [...CATEGORIES_FRAIS, ...[...new Set(ofYear.map((f) => f.categorie))].filter((c) => !CATEGORIES_FRAIS.includes(c))];
    return cats
      .map((cat) => {
        const lines = ofYear.filter((f) => f.categorie === cat).sort((a, b) => a.spent_on.localeCompare(b.spent_on));
        const total = round2(lines.reduce((s, f) => s + f.montant, 0));
        const p = pcts.find((x) => x.annee === year && x.categorie === cat);
        const pct = p?.pct ?? 0;
        return { cat, lines, total, pct, deductible: round2(total * pct), justification: p?.justification ?? null };
      })
      .filter((r) => r.lines.length > 0 || r.pct > 0);
  }, [frais, pcts, year]);

  const totals = useMemo(() => {
    const paid = rows.reduce((s, r) => s + r.total, 0);
    const deductible = rows.reduce((s, r) => s + r.deductible, 0);
    // Projection sur 12 mois pour l'année en cours : le déductible de la période écoulée ramené à l'année entière
    let projection: number | null = null;
    if (year === currentYear) {
      const month = Number(today.slice(5, 7));
      const dim = new Date(currentYear, month, 0).getDate();
      const elapsed = month - 1 + Number(today.slice(8, 10)) / dim;
      if (elapsed >= 1) projection = (deductible * 12) / elapsed;
    }
    return { paid, deductible, projection };
  }, [rows, year, currentYear, today]);

  const toVerify = rows.find((r) => r.cat === A_VERIFIER);

  const savePct = async (cat: string, raw: string) => {
    const value = num(raw);
    if (!(value >= 0 && value <= 100)) return setMsg("Le pourcentage doit être entre 0 et 100.");
    const pct = round2(value) / 100;
    const justification = pctOf(cat)?.justification ?? null;
    setPcts((cur) => [...cur.filter((p) => !(p.annee === year && p.categorie === cat)), { annee: year, categorie: cat, pct, justification }]);
    const { error } = await supabase
      .from("finance_frais_pct")
      .upsert({ person_id: personId, annee: year, categorie: cat, pct, justification, updated_at: new Date().toISOString() }, { onConflict: "person_id,annee,categorie" });
    setMsg(error ? error.message : null);
  };

  const recategorize = async (f: Frais, categorie: string) => {
    setFrais((cur) => cur.map((x) => (x.id === f.id ? { ...x, categorie } : x)));
    const { error } = await supabase.from("finance_frais").update({ categorie }).eq("id", f.id);
    if (error) {
      setFrais((cur) => cur.map((x) => (x.id === f.id ? f : x)));
      setMsg(error.message);
    }
  };

  const remove = async (f: Frais) => {
    if (!confirm(`Supprimer cette ligne (${f.fournisseur || f.categorie}, ${eur(f.montant)}) ?`)) return;
    const { error } = await supabase.from("finance_frais").delete().eq("id", f.id);
    if (error) return setMsg(error.message);
    setFrais((cur) => cur.filter((x) => x.id !== f.id));
  };

  const add = async () => {
    const montant = num(form.montant);
    if (!form.date || !(montant > 0)) return setMsg("Entre une date et un montant.");
    const { data, error } = await supabase
      .from("finance_frais")
      .insert({ person_id: personId, spent_on: form.date, compte: form.compte, categorie: form.categorie, fournisseur: form.fournisseur.trim(), montant })
      .select()
      .single();
    if (error || !data) return setMsg(error?.message ?? "Enregistrement impossible.");
    setFrais((cur) => [...cur, { ...(data as Frais), montant: Number((data as Frais).montant) }]);
    setYear(Number(form.date.slice(0, 4)));
    setForm((f) => ({ ...f, fournisseur: "", montant: "" }));
    setMsg("Ligne ajoutée.");
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Frais professionnels déductibles</span>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => {
                  setYear(y);
                  setExpanded(null);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${y === year ? "border-gold text-gold-light" : "border-line text-muted"}`}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-card-alt p-2.5">
              <div className="text-[10px] font-bold uppercase text-muted">Total payé</div>
              <div className="font-serif text-lg font-semibold text-ink">{eur(totals.paid)}</div>
            </div>
            <div className="rounded-xl bg-card-alt p-2.5">
              <div className="text-[10px] font-bold uppercase text-muted">Déductible {year}</div>
              <div className="font-serif text-lg font-semibold text-gold-light">{eur(totals.deductible)}</div>
              {totals.projection !== null && <div className="text-[10px] text-muted">≈ {eur(totals.projection)} sur 12 mois</div>}
            </div>
          </div>

          {toVerify && toVerify.total > 0 && (
            <div className="mt-2 flex gap-2 rounded-xl border border-line bg-card-alt p-2.5 text-xs text-muted">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-gold-light" />
              <span>
                {eur(toVerify.total)} en « À vérifier » ({toVerify.lines.length} ligne{toVerify.lines.length > 1 ? "s" : ""}) ne comptent pas encore. Ouvre la catégorie et range chaque ligne dans la bonne catégorie.
              </span>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2">
            {rows.length === 0 && <div className="text-xs text-muted">Aucun frais enregistré pour {year}.</div>}
            {rows.map((r) => (
              <div key={r.cat} className="rounded-xl border border-line bg-card-alt p-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setExpanded(expanded === r.cat ? null : r.cat)} className="min-w-0 flex-1 text-left">
                    <div className="text-sm font-bold text-ink">{r.cat}</div>
                    <div className="text-muted">
                      {r.lines.length} ligne{r.lines.length > 1 ? "s" : ""} · payé {eur(r.total)}
                    </div>
                  </button>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-bold text-gold-light">{eur(r.deductible)}</div>
                    <label className="mt-0.5 flex items-center justify-end gap-1 text-muted">
                      <input
                        key={`${year}-${r.cat}-${r.pct}`}
                        defaultValue={String(round2(r.pct * 100)).replace(".", ",")}
                        inputMode="decimal"
                        onBlur={(e) => {
                          if (num(e.target.value) !== round2(r.pct * 100)) void savePct(r.cat, e.target.value);
                        }}
                        className={`${inputCls} w-14 text-right`}
                        aria-label={`% d'usage pro, ${r.cat}`}
                      />
                      %
                    </label>
                  </div>
                </div>
                {r.justification && <div className="mt-1 text-[11px] text-muted">{r.justification}</div>}

                {expanded === r.cat && (
                  <div className="mt-2 flex flex-col gap-1">
                    {r.lines.map((f) => (
                      <div key={f.id} className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-card px-2 py-1.5">
                        <span className="min-w-0 flex-1 text-ink">
                          {dateFr(f.spent_on)} · {f.fournisseur || "—"}
                          <span className="text-muted"> · {f.compte}</span>
                        </span>
                        <strong className="text-ink">{eur(f.montant)}</strong>
                        <select value={f.categorie} onChange={(e) => recategorize(f, e.target.value)} className={`${inputCls} max-w-[150px]`} aria-label="Changer de catégorie">
                          {[...CATEGORIES_FRAIS, ...(CATEGORIES_FRAIS.includes(f.categorie) ? [] : [f.categorie])].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                        <button onClick={() => remove(f)} className="text-muted hover:text-red" aria-label="Supprimer la ligne">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={() => setShowForm((s) => !s)} className="mt-3 flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink">
            <Plus size={13} /> Ajouter une dépense
          </button>
          {showForm && (
            <div className="mt-2 grid gap-2 rounded-xl border border-line bg-card-alt p-2.5 text-xs sm:grid-cols-2">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
              <select value={form.compte} onChange={(e) => setForm({ ...form, compte: e.target.value })} className={inputCls}>
                {COMPTES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} className={inputCls}>
                {CATEGORIES_FRAIS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input value={form.montant} inputMode="decimal" onChange={(e) => setForm({ ...form, montant: e.target.value })} placeholder="Montant (€)" className={inputCls} />
              <input value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} placeholder="Fournisseur" className={`${inputCls} sm:col-span-2`} />
              <button onClick={add} className={`${goldBtn} sm:col-span-2`}>
                Ajouter
              </button>
            </div>
          )}

          <div className="mt-3 text-[11px] text-muted">
            Le % d&apos;usage pro se règle par catégorie et par année ; le déductible se recalcule tout seul. Garde la preuve de chaque frais (facture, extrait). Outil de suivi personnel : il ne remplace pas l&apos;avis d&apos;un comptable.
          </div>
          {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
        </>
      )}
    </div>
  );
}
