import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { CALL_OUTCOMES, OUTCOME_COLOR, REACHED, addCall, emptyFunnel, lecture, parseSeuils, type Funnel, type Lecture } from "@/lib/calls";
import { addDays } from "@/lib/parcours";

type CallRow = { person_id: string; called_at: string; outcome: string; objection_id: string | null; objection_mots: string | null };

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

const LECTURE_TAG: Record<Lecture["kind"], { label: string; color: string }> = {
  trop_tot: { label: "Trop tôt", color: "#8a97b0" },
  volume: { label: "Augmente le volume", color: "#c99a3f" },
  script: { label: "Revois le script", color: "#b3543a" },
  bon: { label: "Bon rythme", color: "#1f8158" },
};

export default async function AppelsPage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  const svc = createServiceClient() as unknown as SupabaseClient;

  // Un administrateur suit toute l'équipe, un coach sa cascade, un collaborateur ses propres appels.
  const { data: people } = await svc.from("people").select("id, name, active, reports_to");
  const kids = new Map<string, string[]>();
  for (const p of (people as { id: string; reports_to: string | null }[] | null) ?? []) if (p.reports_to) kids.set(p.reports_to, [...(kids.get(p.reports_to) ?? []), p.id]);
  const scope = new Set<string>([me.id]);
  const stack = [me.id];
  while (stack.length) {
    for (const k of kids.get(stack.pop()!) ?? []) {
      if (scope.has(k)) continue;
      scope.add(k);
      stack.push(k);
    }
  }
  const scopeIds = [...scope];
  const isTeam = me.is_admin || scope.size > 1;

  const rows: CallRow[] = [];
  for (let from = 0; ; from += 1000) {
    let query = svc.from("call_log").select("person_id, called_at, outcome, objection_id, objection_mots").order("called_at", { ascending: false }).range(from, from + 999);
    if (!me.is_admin) query = query.in("person_id", scopeIds);
    const { data } = await query;
    rows.push(...((data as CallRow[] | null) ?? []));
    if (!data || data.length < 1000) break;
  }

  // Rendez-vous effectués (comptes rendus) du mois, par personne
  const monthFrom = `${toISO(brusselsNow()).slice(0, 7)}-01`;
  let rdvQuery = svc.from("rdv_reports").select("author_id, outcome").gte("happened_on", monthFrom).limit(5000);
  if (!me.is_admin) rdvQuery = rdvQuery.in("author_id", scopeIds);
  const { data: rdvRows } = await rdvQuery;
  const rdvBy = new Map<string, { n: number; outcomes: Record<string, number> }>();
  for (const r of (rdvRows as { author_id: string; outcome: string }[] | null) ?? []) {
    const e = rdvBy.get(r.author_id) ?? { n: 0, outcomes: {} };
    e.n += 1;
    e.outcomes[r.outcome] = (e.outcomes[r.outcome] ?? 0) + 1;
    rdvBy.set(r.author_id, e);
  }

  const [{ data: stRow }, { data: obRows }] = await Promise.all([
    svc.from("app_settings").select("value").eq("key", "appels_seuils").maybeSingle(),
    svc.from("objections").select("id, libelle, mots_clients, reponse_equipe, validee, ordre").order("ordre"),
  ]);
  const seuils = parseSeuils((stRow as { value: unknown } | null)?.value);
  const bank = ((obRows as { id: string; libelle: string; mots_clients: string[]; reponse_equipe: string | null; validee: boolean }[] | null) ?? []).filter((o) => o.validee);
  const obName = new Map(((obRows as { id: string; libelle: string }[] | null) ?? []).map((o) => [o.id, o.libelle]));
  const names = Object.fromEntries(((people as { id: string; name: string }[] | null) ?? []).map((p) => [p.id, p.name]));

  const now = brusselsNow();
  const today = toISO(now);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = toISO(monday);
  const monthStart = `${today.slice(0, 7)}-01`;

  const weekStarts = [3, 2, 1, 0].map((i) => addDays(weekStart, -7 * i));
  const weekIndex = (day: string) => {
    if (day < weekStarts[0]) return -1;
    for (let k = 3; k >= 0; k--) if (day >= weekStarts[k]) return k;
    return -1;
  };
  const myWeeks: Funnel[] = weekStarts.map(emptyFunnel);
  const teamWeeks: Funnel[] = weekStarts.map(emptyFunnel);
  const funnel4 = new Map<string, Funnel>();
  const objCount = new Map<string, number>();
  let objAutre = 0;
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
    const wk = weekIndex(day);
    if (wk >= 0) {
      addCall(teamWeeks[wk], r.outcome);
      if (r.person_id === me.id) addCall(myWeeks[wk], r.outcome);
      addCall(funnel4.get(r.person_id) ?? funnel4.set(r.person_id, emptyFunnel()).get(r.person_id)!, r.outcome);
      if (r.objection_id) objCount.set(obName.get(r.objection_id) ?? "Objection supprimée", (objCount.get(obName.get(r.objection_id) ?? "Objection supprimée") ?? 0) + 1);
      else if (r.objection_mots) objAutre += 1;
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
  const sum = (fs: Funnel[]): Funnel => fs.reduce((t, f) => ({ appels: t.appels + f.appels, joints: t.joints + f.joints, rdv: t.rdv + f.rdv }), emptyFunnel());
  const firstWeek = Math.max(0, myWeeks.findIndex((f) => f.appels > 0));
  const myLecture = lecture(sum(myWeeks), myWeeks.some((f) => f.appels > 0) ? 4 - firstWeek : 1, seuils);
  const lectureOf = (id: string): Lecture => {
    const f = funnel4.get(id) ?? emptyFunnel();
    return lecture(f, 4, seuils);
  };
  const objList = [...objCount.entries()].sort((a, b) => b[1] - a[1]);
  const totals = list.reduce((t, x) => ({ today: t.today + x.today, week: t.week + x.week, month: t.month + x.month }), { today: 0, week: 0, month: 0 });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-xl font-semibold text-ink">Suivi des appels</h2>
        <p className="mt-1 max-w-2xl text-xs text-muted">
          {me.is_admin ? "Nombre d'appels passés par chaque personne." : isTeam ? "Tes appels et ceux de ton équipe." : "Tes appels."} Un appel se compte avec le bouton « Appel » d&apos;un prospect, en choisissant son résultat.
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
        <div className="mb-1 text-sm font-bold text-ink">{isTeam ? "Mon entonnoir (4 dernières semaines)" : "Ton entonnoir (4 dernières semaines)"}</div>
        <p className="mb-2 text-[11px] text-muted">Appels passés, puis joints (la personne a décroché), puis RDV fixés. Les 3 chiffres du vendredi : ceux de la semaine en cours.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-1 pr-2">Semaine du</th>
                <th className="px-2 text-right">Appels</th>
                <th className="px-2 text-right">Joints</th>
                <th className="px-2 text-right">% joints</th>
                <th className="px-2 text-right">RDV fixés</th>
                <th className="pl-2 text-right">% RDV / joints</th>
              </tr>
            </thead>
            <tbody>
              {[...weekStarts].map((w, k) => ({ w, f: myWeeks[k], cur: k === 3 })).reverse().map(({ w, f, cur }) => (
                <tr key={w} className={`border-t border-line ${cur ? "font-bold text-ink" : "text-muted"}`}>
                  <td className="py-1.5 pr-2">{w.slice(8)}/{w.slice(5, 7)}{cur ? " (en cours)" : ""}</td>
                  <td className="px-2 text-right">{f.appels}</td>
                  <td className="px-2 text-right">{f.joints}</td>
                  <td className="px-2 text-right">{pct(f.joints, f.appels)}</td>
                  <td className="px-2 text-right">{f.rdv}</td>
                  <td className="pl-2 text-right">{pct(f.rdv, f.joints)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 rounded-xl border bg-card-alt p-2.5 text-xs text-ink" style={{ borderColor: LECTURE_TAG[myLecture.kind].color }}>
          <span className="font-bold" style={{ color: LECTURE_TAG[myLecture.kind].color }}>{LECTURE_TAG[myLecture.kind].label}.</span> {myLecture.text}
          {myLecture.kind === "script" && (
            <>
              {" "}
              <Link href="/formation/appel-telephonique" className="font-bold text-gold-light underline">
                Revoir la vidéo des appels téléphoniques
              </Link>
              .
            </>
          )}
        </div>
      </div>

      {objList.length > 0 || objAutre > 0 ? (
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-1 text-sm font-bold text-ink">Objections les plus entendues (4 semaines{isTeam ? ", équipe" : ""})</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {objList.map(([label, n]) => (
              <span key={label} className="rounded-full border border-line px-2.5 py-1 font-bold text-ink">
                {label} : {n}
              </span>
            ))}
            {objAutre > 0 && <span className="rounded-full border border-line px-2.5 py-1 font-bold text-muted">Autre : {objAutre}</span>}
          </div>
          <p className="mt-2 text-[11px] text-muted">Une objection est une information sur le client, pas un mur à abattre : je protège avant de vendre.</p>
        </div>
      ) : null}

      {bank.length > 0 && (
        <details className="rounded-2xl border border-line bg-card p-3.5">
          <summary className="cursor-pointer text-sm font-bold text-ink">Banque d&apos;objections de l&apos;équipe ({bank.length})</summary>
          <p className="mt-1 text-[11px] text-muted">Les réponses validées, à dire avec tes propres mots. Aucune promesse de rendement ni de « garanti ».</p>
          <div className="mt-2 flex flex-col gap-2">
            {bank.map((o) => (
              <div key={o.id} className="rounded-xl bg-card-alt p-2.5 text-xs">
                <div className="font-bold text-ink">{o.libelle}</div>
                {o.mots_clients.length > 0 && <div className="mt-0.5 text-muted">{o.mots_clients.map((m) => `« ${m} »`).join(" · ")}</div>}
                <div className="mt-1 text-ink">{o.reponse_equipe ?? "Pas encore de réponse validée."}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 text-sm font-bold text-ink">Par personne</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-1 pr-2">Personne</th>
                <th className="px-2 text-right">Aujourd&apos;hui</th>
                <th className="px-2 text-right">Semaine</th>
                <th className="px-2 text-right">Mois</th>
                <th className="px-2 text-right">Joints (mois)</th>
                <th className="px-2 text-right">RDV (mois)</th>
                <th className="px-2 text-right">Total</th>
                <th className="pl-2 text-left">Lecture (4 sem.)</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-3 text-muted">
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
                    <td className="px-2 text-right text-muted">{x.total}</td>
                    <td className="pl-2 text-xs font-bold" style={{ color: LECTURE_TAG[lectureOf(x.id).kind].color }}>
                      {LECTURE_TAG[lectureOf(x.id).kind].label}
                    </td>
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

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 text-sm font-bold text-ink">Rendez-vous effectués (ce mois-ci)</div>
        {rdvBy.size === 0 ? (
          <div className="text-xs text-muted">Aucun compte rendu de rendez-vous ce mois-ci. Utilise « Rendez-vous effectué » sur un prospect ou un candidat.</div>
        ) : (
          <div className="flex flex-col gap-1 text-xs">
            {[...rdvBy.entries()]
              .sort((x, y) => y[1].n - x[1].n)
              .map(([id, e]) => (
                <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card-alt px-2.5 py-1.5">
                  <span className="font-bold text-ink">{names[id] ?? "?"}</span>
                  <span className="text-muted">
                    {Object.entries(e.outcomes)
                      .map(([o, n]) => `${o} : ${n}`)
                      .join(" · ")}
                  </span>
                  <span className="font-bold text-ink">{e.n}</span>
                </div>
              ))}
          </div>
        )}
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
