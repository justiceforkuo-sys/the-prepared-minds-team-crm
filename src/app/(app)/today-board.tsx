"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate, fmtEUR } from "@/lib/format";
import { RANKS_INFO, nextRank, unitValue } from "@/lib/ranks";
import type { DailyActivity, Goal, Prospect, Rank, CompanyRankingRow } from "@/types/database";

type PillarKey = "prospection" | "invitation" | "formation" | "vision_pillar" | "etat_esprit";

const PILLARS: { key: PillarKey; label: string }[] = [
  { key: "prospection", label: "Prospection" },
  { key: "invitation", label: "Invitation" },
  { key: "formation", label: "Formation" },
  { key: "vision_pillar", label: "Vision" },
  { key: "etat_esprit", label: "État d'esprit" },
];

const emptyActivity = (personId: string, date: string): DailyActivity => ({
  id: "",
  person_id: personId,
  date,
  prospection: false,
  invitation: false,
  formation: false,
  vision_pillar: false,
  etat_esprit: false,
  minutes: 0,
});

type FollowUp = Pick<Prospect, "id" | "name" | "stage" | "next_follow_up">;
type TodayTask = { id: string; title: string; due_date: string | null; assigner: { name: string } | null };

export function TodayBoard({
  personId,
  myRank,
  today,
  initialActivity,
  initialVision,
  followUps,
  goals,
  tasks,
  unitsThisMonth,
  groupUnitsThisMonth,
  top3,
  rankingPosition,
  rankingTotal,
}: {
  personId: string;
  myRank: Rank;
  today: string;
  initialActivity: DailyActivity | null;
  initialVision: string | null;
  followUps: FollowUp[];
  goals: Goal[];
  tasks: TodayTask[];
  unitsThisMonth: number;
  groupUnitsThisMonth: number;
  top3: CompanyRankingRow[];
  rankingPosition: number;
  rankingTotal: number;
}) {
  const supabase = createClient();
  const [activity, setActivity] = useState<DailyActivity>(initialActivity ?? emptyActivity(personId, today));
  const [vision, setVision] = useState(initialVision ?? "");
  const [editingVision, setEditingVision] = useState(false);
  const [goalsList, setGoalsList] = useState(goals);
  const [minutesInput, setMinutesInput] = useState(activity.minutes ? String(activity.minutes) : "");

  const doneCount = PILLARS.filter((p) => activity[p.key]).length;
  const myInfo = RANKS_INFO.find((r) => r.code === myRank);
  const myNext = nextRank(myRank);

  const togglePillar = async (key: PillarKey) => {
    const next = { ...activity, [key]: !activity[key] };
    setActivity(next);
    await supabase
      .from("daily_activity")
      .upsert({ person_id: personId, date: today, [key]: next[key] }, { onConflict: "person_id,date" });
  };

  const saveMinutes = async () => {
    const minutes = Math.max(0, parseInt(minutesInput, 10) || 0);
    setActivity((a) => ({ ...a, minutes }));
    await supabase
      .from("daily_activity")
      .upsert({ person_id: personId, date: today, minutes }, { onConflict: "person_id,date" });
  };

  const saveVision = async () => {
    setEditingVision(false);
    await supabase.from("people").update({ vision }).eq("id", personId);
  };

  const toggleGoal = async (g: Goal) => {
    setGoalsList((prev) => prev.filter((x) => x.id !== g.id));
    await supabase.from("goals").update({ done: true }).eq("id", g.id);
  };

  const r = 54;
  const C = 2 * Math.PI * r;
  const segLen = C / PILLARS.length;
  const gap = 5;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Ma vision</div>
          <button onClick={() => setEditingVision((v) => !v)} className="text-xs text-gold-light">
            {editingVision ? "Annuler" : vision ? "Modifier" : "Écrire"}
          </button>
        </div>
        {editingVision ? (
          <>
            <textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="Pourquoi tu fais ça..."
              className="h-20 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            <button onClick={saveVision} className="mt-2 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night">
              Enregistrer
            </button>
          </>
        ) : (
          <p className="text-sm text-ink">{vision || "Pas encore écrite."}</p>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">Les 5 piliers du jour</div>
        <div className="flex items-center gap-5">
          <svg width="110" height="110" viewBox="0 0 120 120" className="flex-shrink-0">
            <g transform="rotate(-90 60 60)">
              <circle cx="60" cy="60" r={r} fill="none" stroke="#d7e0ec" strokeWidth="10" />
              {PILLARS.map((p, i) => (
                <circle
                  key={p.key}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={activity[p.key] ? "#1e3a6d" : "transparent"}
                  strokeWidth="10"
                  strokeDasharray={`${segLen - gap} ${C - (segLen - gap)}`}
                  strokeDashoffset={-(i * segLen)}
                  strokeLinecap="round"
                />
              ))}
            </g>
            <text
              x="60"
              y="67"
              textAnchor="middle"
              className="fill-gold-light font-serif font-semibold"
              style={{ fontSize: "22px" }}
            >
              {doneCount}/5
            </text>
          </svg>
          <div className="flex flex-1 flex-col gap-1.5">
            {PILLARS.map((p) => (
              <button
                key={p.key}
                onClick={() => togglePillar(p.key)}
                className="flex items-center justify-between rounded-lg border border-line bg-card-alt px-2.5 py-1 text-left text-xs"
              >
                <span className={activity[p.key] ? "text-ink" : "text-muted"}>{p.label}</span>
                <span
                  className={`h-3.5 w-3.5 rounded-full border ${activity[p.key] ? "border-gold bg-gold" : "border-line"}`}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <span className="text-xs text-muted">Temps investi :</span>
          <input
            type="number"
            min={0}
            value={minutesInput}
            onChange={(e) => setMinutesInput(e.target.value)}
            onBlur={saveMinutes}
            className="w-20 rounded-lg border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold"
          />
          <span className="text-xs text-muted">min</span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Ma production du mois</div>
        <div className="font-serif text-2xl font-semibold text-gold-light">
          {fmtEUR(unitValue(myRank) * unitsThisMonth)}
        </div>
        <div className="text-xs text-muted">{unitsThisMonth.toFixed(2)} u perso ce mois-ci</div>
        {groupUnitsThisMonth > 0 && (
          <div className="mt-2 border-t border-line pt-2 text-xs text-muted">
            Groupe direct : <strong className="text-ink">{groupUnitsThisMonth.toFixed(2)} u</strong>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Tâches du jour</div>
          <span className="text-xs font-bold text-gold-light">{tasks.length}</span>
        </div>
        {tasks.length === 0 ? (
          <div className="text-xs text-muted">Aucune tâche pour aujourd&apos;hui.</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {tasks.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-ink">{t.title}</span>
                <span className={`ml-2 flex-shrink-0 font-bold ${t.due_date! < today ? "text-red" : "text-gold-light"}`}>
                  {fmtDate(t.due_date)}
                </span>
              </div>
            ))}
            {tasks.length > 4 && <div className="text-[11px] text-muted">+{tasks.length - 4} autres</div>}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Suivis du jour</div>
          <span className="text-xs font-bold text-gold-light">{followUps.length}</span>
        </div>
        {followUps.length === 0 ? (
          <div className="text-xs text-muted">Aucun suivi programmé aujourd&apos;hui.</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {followUps.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-ink">{p.name}</span>
                <span
                  className={`ml-2 flex-shrink-0 font-bold ${p.next_follow_up! < today ? "text-red" : "text-gold-light"}`}
                >
                  {fmtDate(p.next_follow_up)}
                </span>
              </div>
            ))}
            {followUps.length > 4 && <div className="text-[11px] text-muted">+{followUps.length - 4} autres</div>}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          Ma prochaine promotion ({myInfo?.code})
        </div>
        {myNext ? (
          <div className="text-sm leading-relaxed text-ink">
            Vers <strong className="text-gold-light">{myNext.code} — {myNext.label}</strong> :<br />
            <span className="text-xs text-muted">{myInfo?.next?.label}</span>
          </div>
        ) : (
          <div className="text-sm text-muted">Rang le plus élevé du plan.</div>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          Podium de l&apos;entreprise (ce mois-ci)
        </div>
        {top3.length === 0 ? (
          <div className="text-xs text-muted">Pas encore de production enregistrée ce mois-ci.</div>
        ) : (
          <>
            {rankingPosition > 0 && (
              <div className="mb-2 font-serif text-xl font-semibold text-gold-light">
                #{rankingPosition} <span className="text-xs text-muted">sur {rankingTotal}</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {top3.map((r2, i) => (
                <div
                  key={r2.person_id}
                  className={`flex justify-between text-xs ${
                    r2.person_id === personId ? "font-bold text-gold-light" : "text-muted"
                  }`}
                >
                  <span>
                    {i + 1}. {r2.name}
                  </span>
                  <span>{fmtEUR(unitValue(r2.rank) * r2.units_this_month)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Objectifs en cours</div>
        {goalsList.length === 0 ? (
          <div className="text-xs text-muted">
            Aucun objectif actif — direction l&apos;onglet Objectifs pour en écrire un.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {goalsList.slice(0, 4).map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGoal(g)}
                className="flex items-center gap-2 text-left text-xs"
              >
                <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-line" />
                <span className="flex-1 truncate text-ink">{g.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
