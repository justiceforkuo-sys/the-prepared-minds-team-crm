"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { googleCalendarUrl } from "@/lib/calendar";
import { FOLLOW_UP_MAX, addDaysIso, bucketFollowUps, daysBetween, isSaneFollowUpDate, type FollowUpRow } from "@/lib/follow-ups";
import type { ProspectCategory } from "@/types/database";

const CATEGORY_LABEL: Record<ProspectCategory, string> = {
  client: "Client",
  recrutement: "Recrutement",
  prescripteur: "Prescripteur",
};
const CATEGORY_COLOR: Record<ProspectCategory, string> = {
  client: "#172047",
  recrutement: "#1f8158",
  prescripteur: "#b8923f",
};

type Tab = "late" | "today" | "week";

export function FollowUpBanner({
  prospects,
  ownerId,
  today,
  highlight,
  onSetFollowUp,
}: {
  prospects: FollowUpRow[];
  ownerId: string;
  today: string;
  highlight: boolean;
  onSetFollowUp: (id: string, date: string | null) => void;
}) {
  const buckets = bucketFollowUps(prospects, ownerId, today);
  // Onglet (mobile) : celui choisi par l'utilisateur, sinon le plus urgent qui contient quelque chose
  const [picked, setPicked] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (buckets.late.length > 0 ? "late" : buckets.today.length > 0 ? "today" : "week");
  const [doneId, setDoneId] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: "start" });
  }, [highlight]);

  const total = buckets.late.length + buckets.today.length + buckets.week.length;

  const columns: { key: Tab; title: string; hint: string; rows: FollowUpRow[]; alert?: boolean }[] = [
    { key: "late", title: "En retard", hint: "", rows: buckets.late, alert: true },
    { key: "today", title: "Aujourd'hui", hint: "", rows: buckets.today },
    { key: "week", title: "Cette semaine", hint: "7 prochains jours", rows: buckets.week },
  ];

  return (
    <div
      ref={ref}
      id="a-relancer"
      className={`mb-4 rounded-2xl border bg-card p-3.5 ${highlight ? "border-gold" : "border-line"}`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted">À relancer</h3>
        <span className="text-xs text-muted">
          {total} suivi{total > 1 ? "s" : ""} prospect{total > 1 ? "s" : ""}
        </span>
      </div>

      <div className="mb-2.5 flex gap-1.5 md:hidden">
        {columns.map((c) => (
          <button
            key={c.key}
            onClick={() => setPicked(c.key)}
            className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-bold ${
              tab === c.key ? "border-gold bg-line text-gold-light" : "border-line text-muted"
            }`}
          >
            <span className={c.alert && c.rows.length > 0 ? "text-red" : ""}>{c.title}</span> {c.rows.length}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {columns.map((c) => (
          <div key={c.key} className={tab === c.key ? "block" : "hidden md:block"}>
            <div className="mb-1.5 hidden items-baseline justify-between md:flex">
              <span className={`text-xs font-bold ${c.alert && c.rows.length > 0 ? "text-red" : "text-ink"}`}>{c.title}</span>
              <span className={`text-xs font-bold ${c.alert && c.rows.length > 0 ? "text-red" : "text-gold-light"}`}>
                {c.rows.length}
              </span>
            </div>
            {c.hint && <div className="mb-1.5 hidden text-[10px] text-muted md:block">{c.hint}</div>}
            {c.rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-xs text-muted">
                {c.key === "late" ? "Rien en retard." : c.key === "today" ? "Rien de prévu aujourd'hui." : "Rien de prévu cette semaine."}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {c.rows.map((p) => {
                  const date = p.next_follow_up as string;
                  const late = date < today ? daysBetween(date, today) : 0;
                  return (
                    <div key={p.id} className="rounded-xl border border-line bg-card-alt p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-ink">{p.name}</span>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-night"
                              style={{ background: CATEGORY_COLOR[p.category] }}
                            >
                              {CATEGORY_LABEL[p.category]}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted">{p.stage}</div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className={`text-xs font-bold ${late > 0 ? "text-red" : "text-gold-light"}`}>{fmtDate(date)}</div>
                            <a
                              href={googleCalendarUrl(`Suivi — ${p.name}`, `Prospect Prepared Minds Team — étape : ${p.stage}`, date)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ajouter à Google Calendar"
                              className="text-muted"
                            >
                              <CalendarPlus size={14} />
                            </a>
                          </div>
                          {late > 0 && <div className="text-[10px] font-bold text-red">{late} j de retard</div>}
                        </div>
                      </div>

                      {doneId === p.id ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-muted">Prochain suivi :</span>
                          <input
                            type="date"
                            value={nextDate}
                            min={today}
                            max={FOLLOW_UP_MAX}
                            onChange={(e) => setNextDate(e.target.value)}
                            className="rounded-md border border-line bg-card px-2 py-1 text-xs text-ink outline-none focus:border-gold"
                          />
                          <button
                            disabled={!isSaneFollowUpDate(nextDate)}
                            onClick={() => {
                              onSetFollowUp(p.id, nextDate);
                              setDoneId(null);
                            }}
                            className="rounded-md bg-gold px-2.5 py-1 font-bold text-night disabled:opacity-50"
                          >
                            Valider
                          </button>
                          <button
                            onClick={() => {
                              onSetFollowUp(p.id, null);
                              setDoneId(null);
                            }}
                            className="rounded-md border border-line px-2.5 py-1 text-muted"
                          >
                            Pas de suite prévue
                          </button>
                          <button onClick={() => setDoneId(null)} className="px-1 text-muted">
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <button
                            onClick={() => {
                              setDoneId(p.id);
                              setNextDate(addDaysIso(today, 7));
                            }}
                            className="rounded-md bg-gold px-2.5 py-1 font-bold text-night"
                          >
                            Fait
                          </button>
                          <span className="ml-1 text-muted">Reporter</span>
                          {[1, 3, 7].map((n) => (
                            <button
                              key={n}
                              onClick={() => onSetFollowUp(p.id, addDaysIso(today, n))}
                              className="rounded-md border border-line px-2 py-1 text-gold-light"
                            >
                              +{n} j
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
