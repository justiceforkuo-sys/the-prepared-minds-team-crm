"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { BADGES, hhmm, type ChallengeSummary, type PodiumRow, type TeamOverviewRow, type WinRow } from "@/lib/linkedin/challenge";

interface Goal {
  id: string;
  label: string;
  target: number;
  start_date: string;
  end_date: string;
  reward: string | null;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3 rounded-2xl border border-line bg-card p-4">
      <h3 className="mb-2 font-serif text-base font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-serif text-2xl font-semibold text-gold-light">{value}</div>
    </div>
  );
}

const inputCls = "rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-ink outline-none focus:border-gold";
const btnCls = "rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50";

export function DefiView({
  meId,
  meName,
  isAdmin,
  summary,
  podium,
  overview,
  badges,
  wins,
  people,
  goal,
}: {
  meId: string;
  meName: string;
  isAdmin: boolean;
  summary: ChallengeSummary | null;
  podium: PodiumRow[];
  overview: TeamOverviewRow[];
  badges: string[];
  wins: WinRow[];
  people: { id: string; name: string }[];
  goal: Goal | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const joined = !!summary?.joined && summary.active;

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [time, setTime] = useState(hhmm(summary?.ritual_time ?? "08:00:00"));
  const [emailDaily, setEmailDaily] = useState(summary?.email_daily ?? true);
  const [winText, setWinText] = useState("");
  const [goalForm, setGoalForm] = useState({
    label: goal?.label ?? "RDV LinkedIn ce sprint",
    target: String(goal?.target ?? 15),
    start: goal?.start_date ?? "",
    end: goal?.end_date ?? "",
    reward: goal?.reward ?? "",
  });

  const callJoin = async (body: Record<string, unknown>) => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/linkedin/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as { error?: string; invite?: string; isNew?: boolean };
      if (!res.ok) {
        setNote(`Impossible d'enregistrer : ${json.error ?? res.status}`);
        return;
      }
      if (json.invite === "sent") setNote("C'est enregistré. L'invitation calendrier vient de partir par mail.");
      else if (json.invite === "failed") setNote("C'est enregistré, mais le mail d'invitation n'a pas pu partir. Tu peux le renvoyer plus bas.");
      else setNote("C'est enregistré.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    const { error } = await supabase.from("linkedin_challenge").update({ active: false }).eq("user_id", meId);
    setBusy(false);
    if (error) setNote(`Impossible de quitter le Défi : ${error.message}`);
    else {
      setNote("Tu as quitté le Défi. Ton pipeline reste intact.");
      router.refresh();
    }
  };

  const setBuddy = async (buddyId: string) => {
    const { error } = await supabase.from("linkedin_challenge").update({ buddy_id: buddyId || null }).eq("user_id", meId);
    if (error) setNote(`Binôme non enregistré : ${error.message}`);
    else router.refresh();
  };

  const toggleEmail = async (value: boolean) => {
    setEmailDaily(value);
    const { error } = await supabase.from("linkedin_challenge").update({ email_daily: value }).eq("user_id", meId);
    if (error) setNote(`Réglage non enregistré : ${error.message}`);
  };

  const addWin = async () => {
    const body = winText.trim();
    if (!body) return;
    const { error } = await supabase.from("linkedin_wins").insert({ author_id: meId, body });
    if (error) setNote(`Message non publié : ${error.message}`);
    else {
      setWinText("");
      router.refresh();
    }
  };

  const deleteWin = async (id: string) => {
    await supabase.from("linkedin_wins").delete().eq("id", id);
    router.refresh();
  };

  const saveGoal = async () => {
    const target = parseInt(goalForm.target, 10);
    if (!goalForm.start || !goalForm.end || !target || target < 1) {
      setNote("Objectif d'équipe : renseigne une cible et deux dates.");
      return;
    }
    const row = { label: goalForm.label.trim() || "RDV LinkedIn ce sprint", target, start_date: goalForm.start, end_date: goalForm.end, reward: goalForm.reward.trim() || null };
    const { error } = goal
      ? await supabase.from("linkedin_team_goal").update(row).eq("id", goal.id)
      : await supabase.from("linkedin_team_goal").insert(row);
    if (error) setNote(`Objectif non enregistré : ${error.message}`);
    else {
      setNote("Objectif d'équipe enregistré.");
      router.refresh();
    }
  };

  const [nudgeCopied, setNudgeCopied] = useState(false);
  const buddyFirst = summary?.buddy_name?.split(" ")[0] ?? "";
  const nudge = `Salut ${buddyFirst}, je pense à toi ce matin : et si on se lançait chacun sur nos 5 messages LinkedIn ? Tu me dis quand c'est fait 💪`;

  return (
    <div>
      {note && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink">
          <span>{note}</span>
          <button onClick={() => setNote(null)} className="text-muted">
            Fermer
          </button>
        </div>
      )}

      {!joined ? (
        <Card title="Rejoindre le Défi">
          <p className="mb-3 text-xs text-muted">
            Tu t&apos;engages sur un rituel de 20 minutes chaque jour ouvré. Tu gagnes des points (message envoyé 1, réponse 3, RDV 10, client 25), une série de jours d&apos;affilée à partir de 5 messages par jour, et des badges.
            Tu reçois l&apos;invitation dans ton agenda et un petit mail 15 minutes avant, que tu peux couper quand tu veux.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink">
            <label className="flex items-center gap-2">
              Heure du rituel
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={emailDaily} onChange={(e) => setEmailDaily(e.target.checked)} />
              Recevoir le mail du matin
            </label>
          </div>
          <button disabled={busy || !time} onClick={() => callJoin({ ritualTime: time, emailDaily })} className={btnCls}>
            {busy ? "Un instant…" : "Je rejoins le Défi LinkedIn"}
          </button>
        </Card>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Série en cours" value={`🔥 ${summary!.streak}`} />
            <Stat label="Points cette semaine" value={summary!.points_week} />
            <Stat label="Semaine dernière" value={summary!.points_prev_week} />
            <Stat label="Messages aujourd'hui" value={summary!.today_actions} />
          </div>

          <Card title="Objectif d'équipe">
            {summary!.goal_target ? (
              <>
                <div className="mb-1 flex items-baseline justify-between text-xs text-ink">
                  <span>{summary!.goal_label}</span>
                  <span className="font-bold">
                    {summary!.team_rdv} / {summary!.goal_target} RDV
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.round((summary!.team_rdv / summary!.goal_target) * 100))}%`, background: "linear-gradient(90deg,#f5cd54,#1f8158)" }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] text-muted">
                  Du {summary!.goal_start} au {summary!.goal_end}
                  {summary!.goal_reward ? ` · Récompense : ${summary!.goal_reward}` : ""}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted">Aucun objectif d&apos;équipe défini pour le moment.</p>
            )}
            {isAdmin && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer font-bold text-gold-light">Modifier l&apos;objectif</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input value={goalForm.label} onChange={(e) => setGoalForm({ ...goalForm, label: e.target.value })} placeholder="Libellé" className={inputCls} />
                  <input value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} placeholder="Cible (nombre de RDV)" inputMode="numeric" className={inputCls} />
                  <label className="flex items-center gap-2 text-muted">
                    Début <input type="date" value={goalForm.start} onChange={(e) => setGoalForm({ ...goalForm, start: e.target.value })} className={inputCls} />
                  </label>
                  <label className="flex items-center gap-2 text-muted">
                    Fin <input type="date" value={goalForm.end} onChange={(e) => setGoalForm({ ...goalForm, end: e.target.value })} className={inputCls} />
                  </label>
                  <input value={goalForm.reward} onChange={(e) => setGoalForm({ ...goalForm, reward: e.target.value })} placeholder="Récompense (ex. dîner d'équipe)" className={`${inputCls} sm:col-span-2`} />
                </div>
                <button onClick={saveGoal} className={`${btnCls} mt-2`}>
                  Enregistrer l&apos;objectif
                </button>
              </details>
            )}
          </Card>

          <Card title="Mon binôme">
            <select value={summary!.buddy_id ?? ""} onChange={(e) => setBuddy(e.target.value)} className={`${inputCls} mb-2`}>
              <option value="">Pas de binôme</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {summary!.buddy_name && (
              <div className="text-xs text-ink">
                <div>
                  {summary!.buddy_name} : 🔥 {summary!.buddy_streak ?? 0} jour{(summary!.buddy_streak ?? 0) > 1 ? "s" : ""} · {summary!.buddy_points_week ?? 0} point
                  {(summary!.buddy_points_week ?? 0) > 1 ? "s" : ""} cette semaine
                </div>
                {(summary!.buddy_idle_days ?? 0) >= 2 && (
                  <div className="mt-2 rounded-lg border border-gold px-3 py-2">
                    <div className="mb-1 font-bold">Envoie un petit mot à {buddyFirst}</div>
                    <div className="mb-2 text-muted">Pas d&apos;envoi depuis {summary!.buddy_idle_days} jours ouvrés. Un message d&apos;encouragement peut relancer la série.</div>
                    <div className="mb-2 rounded-lg border border-line px-2.5 py-2">{nudge}</div>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(nudge);
                        setNudgeCopied(true);
                      }}
                      className={btnCls}
                    >
                      {nudgeCopied ? "Copié ✓" : "Copier le message"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Podium de la semaine">
            {podium.length === 0 ? (
              <p className="text-xs text-muted">Le podium se remplit dès les premiers points de la semaine.</p>
            ) : (
              <div className="flex flex-col gap-1.5 text-xs text-ink">
                {podium
                  .filter((r) => r.kind === "semaine")
                  .map((r) => (
                    <div key={`s${r.rank}`} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                      <span>
                        {["🥇", "🥈", "🥉"][r.rank - 1]} {r.person_name}
                      </span>
                      <span className="font-bold">{r.points} pts</span>
                    </div>
                  ))}
                {podium
                  .filter((r) => r.kind === "progression")
                  .map((r) => (
                    <div key="prog" className="flex items-center justify-between rounded-lg border border-gold px-3 py-2">
                      <span>📈 Plus belle progression : {r.person_name}</span>
                      <span className="font-bold">+{r.points} pts</span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          <Card title="Mes badges">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BADGES.map((b) => {
                const got = badges.includes(b.code);
                return (
                  <div key={b.code} title={b.help} className={`rounded-xl border p-3 text-center text-xs ${got ? "border-gold text-ink" : "border-line text-muted opacity-60"}`}>
                    <div className="text-2xl">{got ? b.icon : "🔒"}</div>
                    <div className="mt-1 font-bold">{b.label}</div>
                    <div className="mt-0.5 text-[10px]">{b.help}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Card title="Mur des victoires">
        <p className="mb-2 text-xs text-muted">Une réponse qui t&apos;a fait plaisir ? Partage-la sans nom ni détail qui permettrait d&apos;identifier la personne.</p>
        <div className="mb-3 flex gap-2">
          <input value={winText} onChange={(e) => setWinText(e.target.value)} maxLength={600} placeholder="« Une infirmière m'a répondu qu'elle cherchait justement… »" className={`${inputCls} flex-1`} />
          <button onClick={addWin} disabled={!winText.trim()} className={btnCls}>
            Partager
          </button>
        </div>
        {wins.length === 0 ? (
          <p className="text-xs text-muted">Aucune victoire partagée pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {wins.map((w) => (
              <div key={w.id} className="flex items-start justify-between gap-2 rounded-lg border border-line px-3 py-2 text-xs text-ink">
                <span>🎉 {w.body}</span>
                {(w.author_id === meId || isAdmin) && (
                  <button onClick={() => deleteWin(w.id)} className="shrink-0 text-muted">
                    Supprimer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {overview.length > 0 && (
        <Card title="Vue responsable">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 pr-3 font-normal">Participant</th>
                  <th className="py-1 pr-3 font-normal">Points semaine</th>
                  <th className="py-1 pr-3 font-normal">Série</th>
                  <th className="py-1 font-normal">Dernier envoi</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((o) => (
                  <tr key={o.person_id} className="border-t border-line">
                    <td className="py-1.5 pr-3">
                      {o.person_name}
                      {!o.active ? " (a quitté)" : ""}
                    </td>
                    <td className="py-1.5 pr-3">{o.points_week}</td>
                    <td className="py-1.5 pr-3">🔥 {o.streak}</td>
                    <td className="py-1.5">{o.last_action ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {joined && (
        <Card title="Mon rituel">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink">
            <label className="flex items-center gap-2">
              Heure
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </label>
            <button disabled={busy || !time} onClick={() => callJoin({ ritualTime: time })} className={btnCls}>
              Changer l&apos;heure
            </button>
            <button disabled={busy} onClick={() => callJoin({ resendInvite: true })} className="rounded-lg border border-line px-3 py-1.5 font-bold text-ink">
              Renvoyer l&apos;invitation agenda
            </button>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={emailDaily} onChange={(e) => toggleEmail(e.target.checked)} />
              Mail du matin
            </label>
            <button disabled={busy} onClick={leave} className="ml-auto text-muted underline">
              Quitter le Défi
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">Connecté en tant que {meName}.</p>
        </Card>
      )}
    </div>
  );
}
