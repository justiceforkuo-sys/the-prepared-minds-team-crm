"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate, fmtEUR } from "@/lib/format";

export interface Debt {
  id: string;
  person_id: string;
  nom: string;
  creancier: string | null;
  total: number;
  deja_paye: number;
  paiement_mensuel: number | null;
  echeance: string | null;
  statut: string;
  note: string | null;
  inclus_budget: boolean;
  priorite: number;
}
export interface DebtPayment {
  id: string;
  debt_id: string;
  paid_on: string;
  montant: number;
  note: string | null;
}

const STATUTS = ["En cours", "À négocier", "À provisionner", "À confirmer", "Soldée"];
const STATUT_COLOR: Record<string, string> = {
  "En cours": "var(--color-gold-light)",
  "À négocier": "#b3543a",
  "À provisionner": "#c99a3f",
  "À confirmer": "#6d3fb8",
  Soldée: "#1f8158",
};

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50";
const num = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = { nom: "", creancier: "", total: "", deja_paye: "0", paiement_mensuel: "", echeance: "", statut: "En cours", note: "", inclus_budget: false };

type Client = ReturnType<typeof createClient>;

function DebtCard({
  d,
  payments,
  onChange,
  onRemove,
  onPayment,
  supabase,
}: {
  d: Debt;
  payments: DebtPayment[];
  onChange: (d: Debt) => void;
  onRemove: (id: string) => void;
  onPayment: (p: DebtPayment) => void;
  supabase: Client;
}) {
  const [pay, setPay] = useState(false);
  const [histo, setHisto] = useState(false);
  const [amount, setAmount] = useState(d.paiement_mensuel ? String(d.paiement_mensuel) : "");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const paid = d.deja_paye + payments.reduce((a, p) => a + Number(p.montant), 0);
  const rest = Math.max(0, d.total - paid);
  const pct = d.total > 0 ? Math.min(100, (paid / d.total) * 100) : 100;

  const savePayment = async () => {
    const montant = num(amount);
    if (!(montant > 0)) return setMsg("Entre un montant.");
    const { data, error } = await supabase.from("finance_debt_payments").insert({ debt_id: d.id, person_id: d.person_id, paid_on: date, montant, note: note.trim() || null }).select().single();
    if (error || !data) return setMsg(error?.message ?? "Enregistrement impossible.");
    onPayment(data as DebtPayment);
    if (d.total - (paid + montant) <= 0 && d.statut !== "Soldée") {
      await supabase.from("finance_debts").update({ statut: "Soldée" }).eq("id", d.id);
      onChange({ ...d, statut: "Soldée" });
    }
    setPay(false);
    setNote("");
    setMsg("Paiement enregistré.");
  };

  const setStatut = async (statut: string) => {
    onChange({ ...d, statut });
    await supabase.from("finance_debts").update({ statut }).eq("id", d.id);
  };

  const removePayment = async (p: DebtPayment) => {
    const { error } = await supabase.from("finance_debt_payments").delete().eq("id", p.id);
    if (!error) onPayment({ ...p, montant: -Math.abs(Number(p.montant)) }); // signal de suppression (montant négatif)
  };

  return (
    <div className="rounded-xl border border-line bg-card-alt p-3 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-ink">{d.nom}</div>
          <div className="text-muted">
            {d.creancier ? `${d.creancier} · ` : ""}
            {d.paiement_mensuel ? `${fmtEUR(d.paiement_mensuel)} par mois` : "pas de mensualité fixée"}
            {d.echeance ? ` · fin prévue ${fmtDate(d.echeance)}` : ""}
            {d.inclus_budget ? " · déjà compté dans le budget" : ""}
          </div>
        </div>
        <select value={d.statut} onChange={(e) => setStatut(e.target.value)} className={`${inputCls} font-bold`} style={{ color: STATUT_COLOR[d.statut] }}>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-bold text-ink">Reste {fmtEUR(rest)}</span>
        <span className="text-muted">
          {fmtEUR(paid)} payés sur {fmtEUR(d.total)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      {d.note && <div className="mt-2 whitespace-pre-wrap text-ink">{d.note}</div>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setPay((p) => !p)} className={goldBtn}>
          Enregistrer un paiement
        </button>
        <button onClick={() => setHisto((h) => !h)} className={ghostBtn}>
          Paiements ({payments.length})
        </button>
        <button
          onClick={async () => {
            if (!confirm(`Supprimer « ${d.nom} » et ses paiements ?`)) return;
            const { error } = await supabase.from("finance_debts").delete().eq("id", d.id);
            if (!error) onRemove(d.id);
          }}
          className="ml-auto text-muted hover:text-red"
          aria-label="Supprimer la dette"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {pay && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-card p-2">
          <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} placeholder="Montant (€)" className={`${inputCls} w-24`} />
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultatif)" className={`${inputCls} min-w-[120px] flex-1`} />
          <button onClick={savePayment} className={goldBtn}>
            Valider
          </button>
        </div>
      )}

      {histo && (
        <div className="mt-2 flex flex-col gap-1">
          {payments.length === 0 ? (
            <span className="text-muted">Aucun paiement enregistré depuis le suivi. Avant le suivi : {fmtEUR(d.deja_paye)}.</span>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-card px-2 py-1">
                <span className="text-ink">
                  {fmtDate(p.paid_on)} · <strong>{fmtEUR(Number(p.montant))}</strong>
                  {p.note ? <span className="text-muted"> · {p.note}</span> : null}
                </span>
                <button onClick={() => removePayment(p)} className="text-muted hover:text-red" aria-label="Supprimer ce paiement">
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

export function DebtsSection({ personId, initialDebts, initialPayments }: { personId: string; initialDebts: Debt[]; initialPayments: DebtPayment[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [debts, setDebts] = useState(initialDebts);
  const [payments, setPayments] = useState(initialPayments);
  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState<string | null>(null);

  const paidOf = (d: Debt) => d.deja_paye + payments.filter((p) => p.debt_id === d.id).reduce((a, p) => a + Number(p.montant), 0);
  const totals = useMemo(() => {
    const active = debts.filter((d) => d.statut !== "Soldée");
    return {
      rest: active.reduce((a, d) => a + Math.max(0, d.total - paidOf(d)), 0),
      monthly: active.reduce((a, d) => a + (d.paiement_mensuel ?? 0), 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debts, payments]);

  const add = async () => {
    const total = num(form.total);
    if (!form.nom.trim() || !(total >= 0) || form.total.trim() === "") return setMsg("Nom et total sont obligatoires.");
    const { data, error } = await supabase
      .from("finance_debts")
      .insert({
        person_id: personId,
        nom: form.nom.trim(),
        creancier: form.creancier.trim() || null,
        total,
        deja_paye: num(form.deja_paye) || 0,
        paiement_mensuel: form.paiement_mensuel.trim() ? num(form.paiement_mensuel) : null,
        echeance: form.echeance || null,
        statut: form.statut,
        note: form.note.trim() || null,
        inclus_budget: form.inclus_budget,
      })
      .select()
      .single();
    if (error || !data) return setMsg(error?.message ?? "Enregistrement impossible.");
    setDebts((d) => [...d, data as Debt]);
    setForm(emptyForm);
    setShowForm(false);
    setMsg(null);
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Dettes à rembourser</span>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-card-alt p-2.5">
              <div className="text-[10px] font-bold uppercase text-muted">Reste à payer</div>
              <div className="font-serif text-xl font-semibold text-gold-light">{fmtEUR(totals.rest)}</div>
            </div>
            <div className="rounded-xl bg-card-alt p-2.5">
              <div className="text-[10px] font-bold uppercase text-muted">Mensualités de dettes</div>
              <div className="font-serif text-xl font-semibold text-ink">{fmtEUR(totals.monthly)}</div>
              <div className="text-[10px] text-muted">par mois, dettes en cours</div>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {debts.length === 0 && <div className="text-xs text-muted">Aucune dette enregistrée.</div>}
            {[...debts]
              .sort((a, b) => Number(a.statut === "Soldée") - Number(b.statut === "Soldée") || a.priorite - b.priorite)
              .map((d) => (
                <DebtCard
                  key={d.id}
                  d={d}
                  payments={payments.filter((p) => p.debt_id === d.id).sort((a, b) => b.paid_on.localeCompare(a.paid_on))}
                  supabase={supabase}
                  onChange={(nd) => setDebts((cur) => cur.map((x) => (x.id === nd.id ? nd : x)))}
                  onRemove={(id) => {
                    setDebts((cur) => cur.filter((x) => x.id !== id));
                    setPayments((cur) => cur.filter((p) => p.debt_id !== id));
                  }}
                  onPayment={(p) =>
                    setPayments((cur) => (Number(p.montant) < 0 ? cur.filter((x) => x.id !== p.id) : [...cur.filter((x) => x.id !== p.id), p]))
                  }
                />
              ))}
          </div>

          <button onClick={() => setShowForm((s) => !s)} className={`${ghostBtn} mt-3 flex items-center gap-1`}>
            <Plus size={13} /> Ajouter une dette
          </button>
          {showForm && (
            <div className="mt-2 grid gap-2 rounded-xl border border-line bg-card-alt p-2.5 text-xs sm:grid-cols-2">
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom de la dette" className={inputCls} />
              <input value={form.creancier} onChange={(e) => setForm({ ...form, creancier: e.target.value })} placeholder="À qui (prêteur, administration…)" className={inputCls} />
              <input value={form.total} inputMode="decimal" onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="Total dû (€)" className={inputCls} />
              <input value={form.deja_paye} inputMode="decimal" onChange={(e) => setForm({ ...form, deja_paye: e.target.value })} placeholder="Déjà payé (€)" className={inputCls} />
              <input value={form.paiement_mensuel} inputMode="decimal" onChange={(e) => setForm({ ...form, paiement_mensuel: e.target.value })} placeholder="Paiement par mois (€)" className={inputCls} />
              <label className="flex items-center gap-1.5 text-muted">
                Fin prévue <input type="date" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} className={inputCls} />
              </label>
              <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className={inputCls}>
                {STATUTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-muted">
                <input type="checkbox" checked={form.inclus_budget} onChange={(e) => setForm({ ...form, inclus_budget: e.target.checked })} /> Déjà compté dans mes dépenses
              </label>
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Note" className={`${inputCls} sm:col-span-2`} />
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
