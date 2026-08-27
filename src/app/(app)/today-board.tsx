"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";
import type { DailyActivity, Goal, Prospect } from "@/types/database";

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
  today,
  initialActivity,
  initialVision,
  followUps,
  goals,
  tasks,
}: {
  personId: string;
  today: string;
  initialActivity: DailyActivity | null;
  initialVision: string | null;
  followUps: FollowUp[];
  goals: Goal[];
  tasks: TodayTask[];
}) {
  const supabase = createClient();
  const [activity, setActivity] = useState<DailyActivity>(initialActivity ?? emptyActivity(personId, today));
  const [vision, setVision] = useState(initialVision ?? "");
  const [editingVision, setEditingVision] = useState(false);
  const [goalsList, setGoalsList] = useState(goals);
  const [minutesInput, setMinutesInput] = useState(activity.minutes ? String(activity.minutes) : "");

  const doneCount = PILLARS.filter((p) => activity[p.key]).length;

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
    <div>
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

      <div className="mt-4 rounded-2xl border border-line bg-card p-4">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">Les 5 piliers du jour</div>
        <div className="flex items-center gap-5">
          <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
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
          <div className="flex flex-1 flex-col gap-2">
            {PILLARS.map((p) => (
              <button
                key={p.key}
                onClick={() => togglePillar(p.key)}
                className="flex items-center justify-between rounded-lg border border-line bg-card-alt px-3 py-1.5 text-left text-sm"
              >
                <span className={activity[p.key] ? "text-ink" : "text-muted"}>{p.label}</span>
                <span
                  className={`h-4 w-4 rounded-full border ${activity[p.key] ? "border-gold bg-gold" : "border-line"}`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          Temps investi aujourd&apos;hui
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={minutesInput}
            onChange={(e) => setMinutesInput(e.target.value)}
            onBlur={saveMinutes}
            className="w-24 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
          <span className="text-sm text-muted">minutes</span>
        </div>
      </div>

      {followUps.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Suivis du jour</div>
          <div className="flex flex-col gap-2">
            {followUps.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-line bg-card p-3.5"
              >
                <div>
                  <div className="text-sm font-bold text-ink">{p.name}</div>
                  <div className="text-xs text-muted">{p.stage}</div>
                </div>
                <div className={`text-xs font-bold ${p.next_follow_up! < today ? "text-red" : "text-gold-light"}`}>
                  {fmtDate(p.next_follow_up)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Tâches à faire</div>
          <div className="flex flex-col gap-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-2xl border border-line bg-card p-3.5"
              >
                <div>
                  <div className="text-sm font-bold text-ink">{t.title}</div>
                  <div className="text-xs text-muted">Donnée par {t.assigner?.name ?? "?"}</div>
                </div>
                <div className={`text-xs font-bold ${t.due_date! < today ? "text-red" : "text-gold-light"}`}>
                  {fmtDate(t.due_date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Objectifs en cours</div>
        {goalsList.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
            Aucun objectif actif — direction l&apos;onglet Objectifs pour en écrire un.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {goalsList.slice(0, 5).map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGoal(g)}
                className="flex items-center gap-2.5 rounded-2xl border border-line bg-card p-3.5 text-left"
              >
                <span className="h-4 w-4 flex-shrink-0 rounded-full border border-line" />
                <span className="flex-1 text-sm text-ink">{g.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
