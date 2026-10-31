import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { CALL_OUTCOMES, OUTCOME_COLOR, REACHED } from "@/lib/calls";

type CallRow = { person_id: string; called_at: string; outcome: string };

const brusselsDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

interface Agg {
  today: number;
  week: number;
  month: number;
  total: number;
  monthReached: number;
  monthRdv: number;
  last: string | null;
}

export default async function AppelsPage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  const svc = createServiceClient() as unknown as SupabaseClient;

  // Un administrateur suit toute l'équipe ; un collaborateur ne voit que ses propres appels.
  const rows: CallRow[] = [];
  for (let from = 0; ; from += 1000) {
    let query = svc.from("call_log").select("person_id, called_at, outcome").order("called_at", { ascending: false }).range(from, from + 999);
    if (!me.is_admin) query = query.eq("person_id", me.id);
    const { data } = await query;
    rows.push(...((data as CallRow[] | null) ?? []));
    if (!data || data.length < 1000) break;
  }

  const { data: people } = await svc.from("people").select("id, name, active");
  const names = Object.fromEntries(((people as { id: string; name: string }[] | null) ?? []).map((p) => [p.id, p.name]));

  const now = brusselsNow();
  const today = toISO(now);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = toISO(monday);
  const monthStart = `${today.slice(0, 7)}-01`;

  const by = new Map<string, Agg>();
  const perDay: Record<string, number> = {};
  const outcomes: Record<string, number> = {};
  for (const r of rows) {
    const day = brusselsDay(r.called_at);
    const a = by.get(r.person_id) ?? { today: 0, week: 0, month: 0, total: 0, monthReached: 0, monthRdv: 0, last: null };
    a.total += 1;
    if (day === today) a.today += 1;
    if (day >= weekStart) a.week += 1;
    if (day >= monthStart) {
      a.month += 1;
      if ((REACHED as string[]).includes(r.outcome)) a.monthReached += 1;
      if (r.outcome === "RDV pris") a.monthRdv += 1;
      outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
    }
    if (!a.last || r.called_at > a.last) a.last = r.called_at;
    by.set(r.person_id, a);
    perDay[day] = (perDay[day] ?? 0) + 1;
  }

  const list = [...by.entries()]
    .map(([id, a]) => ({ id, name: names[id] ?? "?", ...a }))
    .sort((x, y) => y.today - x.today || y.week - x.week || y.month - x.month || y.total - x.total);
  if (!me.is_admin && !by.has(me.id)) list.push({ id: me.id, name: names[me.id] ?? me.name, today: 0, week: 0, month: 0, total: 0, monthReached: 0, monthRdv: 0, last: null });

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (13 - i));
    return toISO(d);
  });
  const max = Math.max(1, ...days.map((d) => perDay[d] ?? 0));
  const totals = list.reduce((t, x) => ({ today: t.today + x.today, week: t.week + x.week, month: t.month + x.month }), { today: 0, week: 0, month: 0 });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-xl font-semibold text-ink">Suivi des appels</h2>
        <p className="mt-1 max-w-2xl text-xs text-muted">
          {me.is_admin ? "Nombre d'appels passés par chaque personne." : "Tes appels."} Un appel se compte avec le bouton « Appel » d&apos;un prospect, en choisissant son résultat.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Aujourd'hui", totals.today],
          ["Cette semaine", totals.week],
          ["Ce mois-ci", totals.month],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-2xl border border-line bg-card p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 font-serif text-2xl font-semibold text-gold-light">{n}</div>
            <div className="text-[11px] text-muted">appels</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 text-sm font-bold text-ink">Par personne</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-1 pr-2">Personne</th>
                <th className="px-2 text-right">Aujourd&apos;hui</th>
                <th className="px-2 text-right">Semaine</th>
                <th className="px-2 text-right">Mois</th>
                <th className="px-2 text-right">Joints (mois)</th>
                <th className="px-2 text-right">RDV (mois)</th>
                <th className="pl-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-3 text-muted">
                    Aucun appel enregistré pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                list.map((x) => (
                  <tr key={x.id} className="border-t border-line">
                    <td className="py-1.5 pr-2 font-bold text-ink">{x.name}</td>
                    <td className="px-2 text-right text-ink">{x.today}</td>
                    <td className="px-2 text-right text-ink">{x.week}</td>
                    <td className="px-2 text-right font-bold text-ink">{x.month}</td>
                    <td className="px-2 text-right text-muted">
                      {x.monthReached} ({pct(x.monthReached, x.month)})
                    </td>
                    <td className="px-2 text-right text-muted">{x.monthRdv}</td>
                    <td className="pl-2 text-right text-muted">{x.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">« Joints » : la personne a décroché (répondu, à rappeler, RDV pris, pas intéressé).</p>
      </div>

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 text-sm font-bold text-ink">14 derniers jours</div>
        <div className="flex h-28 items-end gap-1">
          {days.map((d) => {
            const n = perDay[d] ?? 0;
            return (
              <div key={d} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d} : ${n} appel(s)`}>
                <span className="text-[10px] text-muted">{n || ""}</span>
                <div className="w-full rounded-t bg-gold" style={{ height: `${Math.max(2, (n / max) * 80)}px`, opacity: n ? 1 : 0.25 }} />
                <span className="text-[9px] text-muted">{d.slice(8)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {Object.keys(outcomes).length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2 text-sm font-bold text-ink">Résultats des appels (ce mois-ci)</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {CALL_OUTCOMES.filter((o) => outcomes[o]).map((o) => (
              <span key={o} className="rounded-full border px-2.5 py-1 font-bold" style={{ borderColor: OUTCOME_COLOR[o], color: OUTCOME_COLOR[o] }}>
                {o} : {outcomes[o]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
