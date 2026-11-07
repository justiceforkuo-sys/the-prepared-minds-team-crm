"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Revenus mensuels attendus (cas prudent et cas complet) comparés aux dépenses mensuelles : l'écart à couvrir.
// Les dépenses viennent de « Charges » (récurrentes personnelles) et des épargnes déductibles ; rien n'est saisi deux fois.

export interface Revenu {
  id: string;
  person_id: string;
  source: string;
  montant_prudent: number | null;
  montant_complet: number | null;
  remarque: string | null;
  ordre: number;
}

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50";
const eur = (n: number) => n.toLocaleString("fr-BE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
const fmtInput = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

export function RevenusSection({ personId, initialRevenus, depensesMensuelles }: { personId: string; initialRevenus: Revenu[]; depensesMensuelles: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [revenus, setRevenus] = useState(initialRevenus);
  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source: "", prudent: "", complet: "", remarque: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const totalPrudent = revenus.reduce((s, r) => s + (r.montant_prudent ?? 0), 0);
  // Cas complet : si le montant « tout le monde paie » manque, on retombe sur le cas prudent
  const totalComplet = revenus.reduce((s, r) => s + (r.montant_complet ?? r.montant_prudent ?? 0), 0);
  const ecartPrudent = depensesMensuelles - totalPrudent;
  const ecartComplet = depensesMensuelles - totalComplet;

  const patch = async (r: Revenu, changes: Partial<Pick<Revenu, "montant_prudent" | "montant_complet">>) => {
    setRevenus((cur) => cur.map((x) => (x.id === r.id ? { ...x, ...changes } : x)));
    const { error } = await supabase.from("finance_revenus").update(changes).eq("id", r.id);
    if (error) {
      setRevenus((cur) => cur.map((x) => (x.id === r.id ? r : x)));
      setMsg(error.message);
    } else setMsg(null);
  };

  const parse = (raw: string): number | null | undefined => {
    if (raw.trim() === "") return null;
    const v = num(raw);
    return v >= 0 ? v : undefined;
  };

  const add = async () => {
    const prudent = parse(form.prudent);
    const complet = parse(form.complet);
    if (!form.source.trim() || prudent === undefined || complet === undefined) return setMsg("Entre un nom et des montants valides (laisse vide si variable).");
    const { data, error } = await supabase
      .from("finance_revenus")
      .insert({ person_id: personId, source: form.source.trim(), montant_prudent: prudent, montant_complet: complet, remarque: form.remarque.trim() || null, ordre: revenus.length })
      .select()
      .single();
    if (error || !data) return setMsg(error?.message ?? "Enregistrement impossible.");
    setRevenus((cur) => [...cur, data as Revenu]);
    setForm({ source: "", prudent: "", complet: "", remarque: "" });
    setShowForm(false);
    setMsg(null);
  };

  const remove = async (r: Revenu) => {
    if (!confirm(`Supprimer « ${r.source} » ?`)) return;
    const { error } = await supabase.from("finance_revenus").delete().eq("id", r.id);
    if (error) return setMsg(error.message);
    setRevenus((cur) => cur.filter((x) => x.id !== r.id));
  };

  const ecartLine = (label: string, ecart: number) => (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-bold ${ecart > 0 ? "text-red" : "text-green"}`}>{ecart > 0 ? `${eur(ecart)} à couvrir` : `${eur(-ecart)} de marge`}</span>
    </div>
  );

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Revenus mensuels et écart à couvrir</span>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <>
          <div className="mt-2 flex flex-col gap-2">
            {revenus.length === 0 && <div className="text-xs text-muted">Aucun revenu mensuel enregistré.</div>}
            {revenus.map((r) => (
              <div key={r.id} className="rounded-xl border border-line bg-card-alt p-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink">{r.source}</div>
                    {r.remarque && <div className="text-muted">{r.remarque}</div>}
                  </div>
                  <button onClick={() => remove(r)} className="text-muted hover:text-red" aria-label="Supprimer">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <label className="text-muted">
                    Cas prudent
                    <input
                      key={`p-${r.id}-${r.montant_prudent}`}
                      defaultValue={fmtInput(r.montant_prudent)}
                      placeholder="variable"
                      inputMode="decimal"
                      onBlur={(e) => {
                        const v = parse(e.target.value);
                        if (v !== undefined && v !== r.montant_prudent) void patch(r, { montant_prudent: v });
                      }}
                      className={`${inputCls} mt-0.5 w-full`}
                    />
                  </label>
                  <label className="text-muted">
                    Cas complet
                    <input
                      key={`c-${r.id}-${r.montant_complet}`}
                      defaultValue={fmtInput(r.montant_complet)}
                      placeholder="= prudent"
                      inputMode="decimal"
                      onBlur={(e) => {
                        const v = parse(e.target.value);
                        if (v !== undefined && v !== r.montant_complet) void patch(r, { montant_complet: v });
                      }}
                      className={`${inputCls} mt-0.5 w-full`}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-card-alt p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted">Revenus fixes (cas prudent / complet)</span>
              <span className="font-bold text-ink">
                {eur(totalPrudent)} / {eur(totalComplet)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Dépenses mensuelles (charges + épargnes)</span>
              <span className="font-bold text-ink">{eur(depensesMensuelles)}</span>
            </div>
            {ecartLine("Écart, cas prudent", ecartPrudent)}
            {ecartLine("Écart, cas complet", ecartComplet)}
            <div className="text-[11px] text-muted">Les commissions et autres revenus variables ne sont pas comptés ici : ils servent à combler l&apos;écart.</div>
          </div>

          <button onClick={() => setShowForm((s) => !s)} className="mt-3 flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink">
            <Plus size={13} /> Ajouter un revenu
          </button>
          {showForm && (
            <div className="mt-2 grid gap-2 rounded-xl border border-line bg-card-alt p-2.5 text-xs sm:grid-cols-2">
              <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Source (loyers, salaire, commissions…)" className={`${inputCls} sm:col-span-2`} />
              <input value={form.prudent} inputMode="decimal" onChange={(e) => setForm({ ...form, prudent: e.target.value })} placeholder="Cas prudent (€)" className={inputCls} />
              <input value={form.complet} inputMode="decimal" onChange={(e) => setForm({ ...form, complet: e.target.value })} placeholder="Cas complet (€)" className={inputCls} />
              <input value={form.remarque} onChange={(e) => setForm({ ...form, remarque: e.target.value })} placeholder="Remarque" className={`${inputCls} sm:col-span-2`} />
              <button onClick={add} className={`${goldBtn} sm:col-span-2`}>
                Ajouter
              </button>
            </div>
          )}
          {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
        </>
      )}
    </div>
  );
}
