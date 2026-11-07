"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Suivi du quotidien : on note ce qu'on dépense chaque jour. Avec un budget par jour, le montant conseillé du jour
// se recalcule en tenant compte de tout ce qui a déjà été dépensé depuis le début du mois : un écart n'est jamais oublié.

export interface DailySpend {
  id: string;
  person_id: string;
  spent_on: string;
  montant: number;
  categorie: string;
  note: string | null;
}

const CATEGORIES = ["Nourriture", "Transport", "Restaurant / café", "Santé", "Loisirs", "Téléphone / internet", "Famille", "Autre"];

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50";

const eur = (n: number) =>
  n.toLocaleString("fr-BE", { style: "currency", currency: "EUR", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const num = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
const round2 = (n: number) => Math.round(n * 100) / 100;
const todayBrussels = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
const dayLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" });

function shiftDay(d: string, delta: number): string {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + delta);
  return x.toLocaleDateString("sv-SE");
}

export function DailySection({
  personId,
  initialEntries,
  initialBudget,
}: {
  personId: string;
  initialEntries: DailySpend[];
  initialBudget: number | null;
}) {
  const supabase = createClient();
  const [today] = useState(todayBrussels);
  const [entries, setEntries] = useState(initialEntries);
  const [budget, setBudget] = useState<number | null>(initialBudget);
  const [budgetInput, setBudgetInput] = useState(initialBudget === null ? "" : String(initialBudget));
  const [open, setOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({ montant: "", categorie: CATEGORIES[0], note: "", date: today });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const month = today.slice(0, 7);
    const dayN = Number(today.slice(8, 10));
    const dim = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
    const monthEntries = entries.filter((e) => e.spent_on.startsWith(month) && e.spent_on <= today);
    const spentMonth = monthEntries.reduce((s, e) => s + e.montant, 0);
    const spentToday = entries.filter((e) => e.spent_on === today).reduce((s, e) => s + e.montant, 0);
    const spentBefore = spentMonth - spentToday;
    const average = dayN > 0 ? spentMonth / dayN : 0;

    const byCat = new Map<string, number>();
    for (const e of monthEntries) byCat.set(e.categorie, (byCat.get(e.categorie) ?? 0) + e.montant);
    const categories = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

    const perDay = new Map<string, number>();
    for (const e of entries) perDay.set(e.spent_on, (perDay.get(e.spent_on) ?? 0) + e.montant);
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = shiftDay(today, i - 13);
      return { d, total: perDay.get(d) ?? 0 };
    });

    const monthBudget = budget === null ? null : budget * dim;
    const allowance = monthBudget === null ? null : (monthBudget - spentBefore) / (dim - dayN + 1);
    return {
      dayN,
      dim,
      spentMonth,
      spentToday,
      average,
      projection: average * dim,
      categories,
      last14,
      maxDay: Math.max(1, ...last14.map((x) => x.total)),
      gap: budget === null ? null : spentMonth - budget * dayN,
      allowance,
      remainingToday: allowance === null ? null : allowance - spentToday,
      monthBudget,
      perDay,
    };
  }, [entries, budget, today]);

  const days = useMemo(() => {
    const byDay = new Map<string, DailySpend[]>();
    for (const e of entries) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e]);
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);
  const visibleDays = showHistory ? days.slice(0, 31) : days.filter(([d]) => d === today);

  const add = async () => {
    const montant = round2(num(form.montant));
    if (!(montant > 0)) return setMsg("Indique un montant supérieur à 0.");
    if (form.date > today) return setMsg("La date ne peut pas être dans le futur.");
    setSaving(true);
    setMsg(null);
    const { data, error } = await supabase
      .from("finance_daily")
      .insert({ person_id: personId, spent_on: form.date, montant, categorie: form.categorie, note: form.note.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (error || !data) return setMsg(error?.message ?? "Enregistrement impossible.");
    const row = data as DailySpend;
    setEntries((cur) => [{ ...row, montant: Number(row.montant) }, ...cur]);
    setForm((f) => ({ ...f, montant: "", note: "", date: today }));
  };

  const remove = async (id: string) => {
    const keep = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    const { error } = await supabase.from("finance_daily").delete().eq("id", id);
    if (error) {
      setEntries(keep);
      setMsg(error.message);
    }
  };

  const saveBudget = async () => {
    const raw = budgetInput.trim();
    const value = raw === "" ? null : round2(num(raw));
    if (value !== null && !(value >= 0)) return setMsg("Budget invalide.");
    const { error } = await supabase
      .from("finance_daily_settings")
      .upsert({ person_id: personId, budget_jour: value, updated_at: new Date().toISOString() });
    if (error) return setMsg(error.message);
    setBudget(value);
    setMsg(value === null ? "Budget par jour retiré." : "Budget par jour enregistré.");
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Mes dépenses du quotidien</span>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <>
          <p className="mt-1 text-[11px] text-muted">
            Note chaque dépense du jour, même petite : c&apos;est l&apos;addition des petits écarts qui pèse à la fin du mois. Séparé de tes charges
            (estimation fiscale), visible par toi seul.
          </p>

          {/* Saisie rapide */}
          <div className="mt-3 rounded-xl border border-line bg-card-alt p-2.5">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, categorie: c }))}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${form.categorie === c ? "border-gold bg-gold font-bold text-night" : "border-line text-ink"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={form.montant}
                inputMode="decimal"
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="Montant (€)"
                className={`${inputCls} w-28`}
                aria-label="Montant dépensé"
              />
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="Note (facultatif)"
                className={`${inputCls} min-w-[120px] flex-1`}
              />
              <input type="date" max={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value || today })} className={inputCls} aria-label="Date" />
              <button onClick={add} disabled={saving} className={goldBtn}>
                Ajouter
              </button>
            </div>
          </div>
          {msg && <div className="mt-1.5 text-[11px] text-ink">{msg}</div>}

          {/* Aujourd'hui et mois */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-card-alt p-2.5">
              <div className="text-[10px] font-bold uppercase text-muted">Aujourd&apos;hui</div>
              <div className="font-serif text-xl font-semibold text-gold-light">{eur(stats.spentToday)}</div>
              {stats.allowance !== null && stats.remainingToday !== null && (
                <div className={`text-[10px] ${stats.remainingToday >= 0 ? "text-muted" : "text-red"}`}>
                  {stats.remainingToday >= 0 ? `Il te reste ${eur(Math.round(stats.remainingToday * 100) / 100)} sur ${eur(Math.max(0, Math.round(stats.allowance * 100) / 100))} conseillés` : `${eur(Math.round(-stats.remainingToday * 100) / 100)} au-dessus du conseillé du jour`}
                </div>
              )}
            </div>
            <div className="rounded-xl bg-card-alt p-2.5">
              <div className="text-[10px] font-bold uppercase text-muted">Ce mois-ci</div>
              <div className="font-serif text-xl font-semibold text-ink">{eur(stats.spentMonth)}</div>
              <div className="text-[10px] text-muted">
                {eur(Math.round(stats.average * 100) / 100)} par jour · projection {eur(Math.round(stats.projection))}
              </div>
            </div>
          </div>

          {/* Budget par jour et effet cumulé */}
          <div className="mt-3 rounded-xl border border-line bg-card-alt p-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-muted" htmlFor="budget-jour">
                Mon budget par jour
              </label>
              <input id="budget-jour" value={budgetInput} inputMode="decimal" onChange={(e) => setBudgetInput(e.target.value)} placeholder="ex. 30" className={`${inputCls} w-24`} />
              <span className="text-muted">€</span>
              <button onClick={saveBudget} className="rounded-md border border-line px-2.5 py-1 text-xs text-ink">
                Enregistrer
              </button>
            </div>
            {stats.gap !== null && stats.monthBudget !== null && stats.allowance !== null ? (
              <div className="mt-2 text-muted">
                <div>
                  Depuis le 1er : <strong className="text-ink">{eur(stats.spentMonth)}</strong> dépensés pour {stats.dayN} jour{stats.dayN > 1 ? "s" : ""} de budget ({eur(Math.round(budget! * stats.dayN))}).{" "}
                  <strong className={stats.gap > 0 ? "text-red" : "text-[#1f8158]"}>
                    {stats.gap > 0 ? `Écart cumulé : +${eur(Math.round(stats.gap * 100) / 100)}.` : `Tu es ${eur(Math.round(-stats.gap * 100) / 100)} en dessous du budget.`}
                  </strong>
                </div>
                <div className="mt-1">
                  {stats.allowance > 0
                    ? `Pour finir le mois dans ton budget de ${eur(Math.round(stats.monthBudget))} : ${eur(Math.round(stats.allowance * 100) / 100)} par jour sur les ${stats.dim - stats.dayN + 1} jours restants, aujourd'hui compris. Ce montant se réajuste chaque jour : un jour trop cher se rattrape doucement les jours suivants.`
                    : `Le budget du mois (${eur(Math.round(stats.monthBudget))}) est épuisé : chaque dépense en plus s'ajoute au dépassement.`}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-muted">Fixe un budget par jour pour voir l&apos;écart cumulé et le montant conseillé du jour.</div>
            )}
          </div>

          {/* 14 derniers jours */}
          <div className="mt-3">
            <div className="mb-1 text-[10px] font-bold uppercase text-muted">14 derniers jours</div>
            <div className="flex h-24 items-end gap-1">
              {stats.last14.map((x) => {
                const over = budget !== null && x.total > budget;
                return (
                  <div key={x.d} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${dayLabel(x.d)} : ${eur(x.total)}`}>
                    <span className="text-[9px] text-muted">{x.total > 0 ? Math.round(x.total) : ""}</span>
                    <div
                      className={`w-full rounded-t ${over ? "bg-red" : "bg-gold"}`}
                      style={{ height: `${Math.max(2, (x.total / stats.maxDay) * 60)}px`, opacity: x.total ? 1 : 0.25 }}
                    />
                    <span className="text-[9px] text-muted">{x.d.slice(8)}</span>
                  </div>
                );
              })}
            </div>
            {budget !== null && <div className="mt-1 text-[10px] text-muted">En rouge : les jours au-dessus de ton budget par jour.</div>}
          </div>

          {/* Par catégorie */}
          {stats.categories.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] font-bold uppercase text-muted">Où part l&apos;argent ce mois-ci</div>
              <div className="flex flex-col gap-1.5">
                {stats.categories.map(([cat, total]) => (
                  <div key={cat} className="text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink">{cat}</span>
                      <span className="text-muted">
                        {eur(Math.round(total * 100) / 100)} · {Math.round((total / (stats.spentMonth || 1)) * 100)} %
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-card-alt">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${(total / (stats.categories[0][1] || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste */}
          <div className="mt-3 flex flex-col gap-2">
            {visibleDays.length === 0 && <div className="text-xs text-muted">Rien de noté aujourd&apos;hui.</div>}
            {visibleDays.map(([d, list]) => (
              <div key={d} className="rounded-xl border border-line p-2">
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-muted">
                  <span>{d === today ? "Aujourd'hui" : dayLabel(d)}</span>
                  <span className="text-ink">{eur(Math.round(list.reduce((s, e) => s + e.montant, 0) * 100) / 100)}</span>
                </div>
                {list.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 py-0.5 text-xs">
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {e.categorie}
                      {e.note ? <span className="text-muted"> · {e.note}</span> : null}
                    </span>
                    <span className="flex-shrink-0 font-bold text-ink">{eur(e.montant)}</span>
                    <button onClick={() => remove(e.id)} aria-label="Supprimer cette dépense">
                      <Trash2 size={12} className="text-red" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {days.length > 0 && (
            <button onClick={() => setShowHistory((s) => !s)} className="mt-2 text-[11px] font-bold text-gold-light underline">
              {showHistory ? "Masquer les jours précédents" : "Voir les jours précédents"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
