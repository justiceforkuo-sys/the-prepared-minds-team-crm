import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { currentTimeMs, formatDuration, sinceLabel, ONLINE_WINDOW_SECONDS } from "@/lib/presence";
import { OnlineList } from "@/components/presence";

type Row = { person_id: string; day: string; seconds: number; visits: number; last_seen: string };

interface Agg {
  today: number;
  week: number;
  month: number;
  total: number;
  monthDays: number;
  monthVisits: number;
  last: string | null;
}

export default async function ActivitePage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  const svc = createServiceClient() as unknown as SupabaseClient;

  // Un administrateur voit toute l'équipe ; un collaborateur ne voit que son propre temps.
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let query = svc.from("activity_daily").select("person_id, day, seconds, visits, last_seen").order("day", { ascending: false }).range(from, from + 999);
    if (!me.is_admin) query = query.eq("person_id", me.id);
    const { data } = await query;
    rows.push(...((data as Row[] | null) ?? []));
    if (!data || data.length < 1000) break;
  }
  const { data: people } = await svc.from("people").select("id, name, active");
  const roster = ((people as { id: string; name: string; active: boolean | null }[] | null) ?? []).filter((p) => p.active !== false);
  const names = Object.fromEntries(roster.map((p) => [p.id, p.name]));

  const now = brusselsNow();
  const today = toISO(now);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = toISO(monday);
  const monthStart = `${today.slice(0, 7)}-01`;

  const by = new Map<string, Agg>();
  const perDay: Record<string, number> = {};
  for (const r of rows) {
    const a = by.get(r.person_id) ?? { today: 0, week: 0, month: 0, total: 0, monthDays: 0, monthVisits: 0, last: null };
    a.total += r.seconds;
    if (r.day === today) a.today += r.seconds;
    if (r.day >= weekStart) a.week += r.seconds;
    if (r.day >= monthStart) {
      a.month += r.seconds;
      a.monthVisits += r.visits;
      if (r.seconds >= 60) a.monthDays += 1;
    }
    if (!a.last || r.last_seen > a.last) a.last = r.last_seen;
    by.set(r.person_id, a);
    perDay[r.day] = (perDay[r.day] ?? 0) + r.seconds;
  }

  const empty: Agg = { today: 0, week: 0, month: 0, total: 0, monthDays: 0, monthVisits: 0, last: null };
  const ids = me.is_admin ? roster.map((p) => p.id) : [me.id];
  const list = ids
    .map((id) => ({ id, name: names[id] ?? me.name, ...(by.get(id) ?? empty) }))
    .sort((x, y) => y.month - x.month || y.total - x.total || x.name.localeCompare(y.name));
  const totals = list.reduce((t, x) => ({ today: t.today + x.today, week: t.week + x.week, month: t.month + x.month }), { today: 0, week: 0, month: 0 });

  const nowMs = currentTimeMs();
  const isOnline = (iso: string | null) => !!iso && nowMs - new Date(iso).getTime() < ONLINE_WINDOW_SECONDS * 1000;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (13 - i));
    return toISO(d);
  });
  const max = Math.max(1, ...days.map((d) => perDay[d] ?? 0));
  const scope = me.is_admin ? "toute l'équipe" : "toi";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-xl font-semibold text-ink">Activité sur le CRM</h2>
        <p className="mt-1 max-w-2xl text-xs text-muted">
          Qui est en ligne en ce moment, et le temps passé sur le CRM par {me.is_admin ? "chaque personne" : "toi"}. Le temps compte seulement quand
          l&apos;onglet est ouvert et que la personne s&apos;en sert (souris, clavier, défilement) ; une pause de plus de 2 minutes ne compte pas.
          {me.is_admin ? " Les administrateurs voient tout le monde ; chaque collaborateur ne voit que son propre temps." : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <OnlineList meId={me.id} />
        <p className="mt-2 text-[11px] text-muted">Mise à jour toutes les 30 secondes.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Aujourd'hui", totals.today],
          ["Cette semaine", totals.week],
          ["Ce mois-ci", totals.month],
        ].map(([label, s]) => (
          <div key={label as string} className="rounded-2xl border border-line bg-card p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 font-serif text-2xl font-semibold text-gold-light">{formatDuration(s as number)}</div>
            <div className="text-[11px] text-muted">{scope}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 text-sm font-bold text-ink">{me.is_admin ? "Par personne" : "Mon temps"}</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-1 pr-2">Personne</th>
                <th className="px-2 text-right">Aujourd&apos;hui</th>
                <th className="px-2 text-right">Semaine</th>
                <th className="px-2 text-right">Mois</th>
                <th className="px-2 text-right">Jours actifs (mois)</th>
                <th className="px-2 text-right">Connexions (mois)</th>
                <th className="pl-2 text-right">Dernière visite</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className="border-t border-line">
                  <td className="py-1.5 pr-2 font-bold text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${isOnline(x.last) ? "bg-[#3ecf8e]" : "bg-line"}`} />
                      {x.name}
                    </span>
                  </td>
                  <td className="px-2 text-right text-ink">{formatDuration(x.today)}</td>
                  <td className="px-2 text-right text-ink">{formatDuration(x.week)}</td>
                  <td className="px-2 text-right font-bold text-ink">{formatDuration(x.month)}</td>
                  <td className="px-2 text-right text-muted">{x.monthDays}</td>
                  <td className="px-2 text-right text-muted">{x.monthVisits}</td>
                  <td className="pl-2 text-right text-muted">{x.last ? (isOnline(x.last) ? "en ligne" : sinceLabel(x.last, nowMs)) : "jamais"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          « Jours actifs » : jours du mois avec au moins 1 minute d&apos;utilisation. « Connexions » : nombre de fois où la personne est revenue sur le CRM après
          plus de 5 minutes d&apos;absence. Le suivi a démarré à la mise en ligne de cette page : les chiffres se remplissent à partir de là.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 text-sm font-bold text-ink">14 derniers jours ({scope}, temps cumulé)</div>
        <div className="flex h-28 items-end gap-1">
          {days.map((d) => {
            const s = perDay[d] ?? 0;
            return (
              <div key={d} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d} : ${formatDuration(s)}`}>
                <span className="text-[9px] text-muted">{s >= 60 ? formatDuration(s).replace(" min", "′").replace(" h ", "h") : ""}</span>
                <div className="w-full rounded-t bg-gold" style={{ height: `${Math.max(2, (s / max) * 70)}px`, opacity: s ? 1 : 0.25 }} />
                <span className="text-[9px] text-muted">{d.slice(8)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
