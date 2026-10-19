"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { launchOnboarding } from "./actions";
import { CandidateCard, type CandidateRowData } from "./candidate-card";
import { RecruitmentFunnel } from "./recrutement-funnel";
import { PIPELINE_STATUSES, RECRUITMENT_STATUSES, needsCallback, type RecruitmentRow, type RecruitmentStatus } from "@/lib/recruitment";

type Person = { id: string; name: string };

function normalize(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

// Une fiche existante « ressemble » à un candidat si tous les mots du nom du candidat s'y retrouvent
function similarPeople(candidate: string, people: Person[]): Person[] {
  const tokens = normalize(candidate);
  if (tokens.length === 0) return [];
  return people.filter((p) => {
    const hay = normalize(p.name);
    return tokens.every((t) => hay.includes(t));
  });
}

const SCORE_RANK = { Fort: 0, Moyen: 1, "À creuser": 2 } as const;

export function RecrutementBoard({
  isAdmin,
  meId,
  initialCandidates,
  people,
  mySlug,
  myLinks,
  interviewLinks,
  nowIso,
  today,
}: {
  isAdmin: boolean;
  meId: string;
  initialCandidates: CandidateRowData[];
  people: Person[];
  mySlug: string | null;
  myLinks: Record<string, string>;
  interviewLinks: Record<string, string>;
  nowIso: string;
  today: string;
}) {
  const supabase = createClient();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [filter, setFilter] = useState<RecruitmentStatus | "Tous" | "A rappeler">("Tous");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState(myLinks.entretien ?? "");
  const [savedLink, setSavedLink] = useState(myLinks.entretien ?? "");
  const [linkTo, setLinkTo] = useState<Record<string, string>>({});

  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const applicationLink = mySlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/postuler/${mySlug}` : null;

  const copyLink = () => {
    if (!applicationLink) return;
    navigator.clipboard.writeText(applicationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveInterviewLink = async () => {
    const value = linkValue.trim();
    if (value === savedLink) return;
    const next = Object.fromEntries(Object.entries({ ...myLinks, entretien: value }).filter(([, v]) => v));
    const { error } = await supabase.from("people").update({ calendly_links: next }).eq("id", meId);
    if (error) {
      setMessage(`Lien non enregistré : ${error.message}`);
      return;
    }
    setSavedLink(value);
    setMessage("Lien d'entretien enregistré.");
  };

  const patch = async (id: string, change: Partial<RecruitmentRow>) => {
    const owner = change.owner_id !== undefined ? { owner: people.find((p) => p.id === change.owner_id) ? { name: people.find((p) => p.id === change.owner_id)!.name } : null } : {};
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...change, ...owner, stage_changed_at: change.status && change.status !== c.status ? nowIso : c.stage_changed_at }
          : c
      )
    );
    const { error } = await supabase.from("recruitment_applications").update(change).eq("id", id);
    if (error) setMessage(`Enregistrement impossible : ${error.message}`);
  };

  const launch = async (id: string, existingPersonId?: string) => {
    setLaunching(id);
    const res = await launchOnboarding(id, existingPersonId);
    setLaunching(null);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status: "Intégré", person_id: res.personId, stage_changed_at: nowIso, next_action: null, next_action_date: null } : c)));
    setMessage(res.message);
  };

  const callbackCount = useMemo(() => candidates.filter((c) => needsCallback(c, today, now)).length, [candidates, today, now]);
  const withoutOnboarding = candidates.filter((c) => c.status === "Retenu" && !c.person_id);

  const countFor = (s: RecruitmentStatus) => candidates.filter((c) => c.status === s).length;

  const visible = useMemo(() => {
    let list = candidates;
    if (filter === "A rappeler") list = list.filter((c) => needsCallback(c, today, now));
    else if (filter !== "Tous") list = list.filter((c) => c.status === filter);
    return [...list].sort((a, b) => {
      const ra = a.score_label ? SCORE_RANK[a.score_label] : 3;
      const rb = b.score_label ? SCORE_RANK[b.score_label] : 3;
      if (ra !== rb) return ra - rb;
      return a.created_at < b.created_at ? 1 : -1;
    });
  }, [candidates, filter, today, now]);

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Recrutement</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Règle d&apos;or : un premier contact sous 24 à 48 heures. Chaque candidat a un responsable et une prochaine action.
      </p>

      {message && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-muted">
            Fermer
          </button>
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {applicationLink && (
          <div className="rounded-2xl border border-line bg-card p-3.5">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Ton lien de candidature</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-lg border border-line bg-card-alt px-3 py-2 text-xs text-ink">{applicationLink}</div>
              <button onClick={copyLink} className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-gold px-3 py-2 text-xs font-bold text-night">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Ton lien « Entretien de Recrutement » (Calendly)</div>
          <input
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onBlur={saveInterviewLink}
            placeholder="https://calendly.com/…/entretien-de-recrutement"
            className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-xs text-ink outline-none focus:border-gold"
          />
          <div className="mt-1 text-[11px] text-muted">Proposé aux candidats après leur formulaire et copié par « Envoyer le lien d&apos;entretien ».</div>
        </div>
      </div>

      <RecruitmentFunnel candidates={candidates} isAdmin={isAdmin} nowIso={nowIso} />

      {withoutOnboarding.length > 0 && (
        <div className="mb-4 rounded-2xl border border-gold bg-card p-3.5">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Retenus sans onboarding</div>
          <p className="mb-2.5 text-xs text-muted">Ces candidats sont retenus mais n&apos;ont pas encore de compte dans l&apos;équipe. À toi de décider.</p>
          <div className="flex flex-col gap-2">
            {withoutOnboarding.map((c) => {
              const similar = similarPeople(c.name, people);
              const choices = [...similar, ...people.filter((p) => !similar.some((s) => s.id === p.id))];
              return (
                <div key={c.id} className="rounded-xl border border-line bg-card-alt p-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-ink">{c.name}</div>
                      <div className="text-muted">{c.email ?? "Pas d'email : à compléter avant l'invitation"}</div>
                    </div>
                    <button
                      onClick={() => launch(c.id)}
                      disabled={launching === c.id || !c.email}
                      className="rounded-md bg-gold px-2.5 py-1.5 text-xs font-bold text-night disabled:opacity-50"
                    >
                      {launching === c.id ? "Création…" : "Lancer l'onboarding"}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-muted">Déjà dans l&apos;équipe ?</span>
                    <select
                      value={linkTo[c.id] ?? ""}
                      onChange={(e) => setLinkTo((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="rounded-md border border-line bg-card px-2 py-1 text-xs text-ink outline-none focus:border-gold"
                    >
                      <option value="">Choisir une fiche…</option>
                      {choices.map((p) => (
                        <option key={p.id} value={p.id}>
                          {similar.some((s) => s.id === p.id) ? `★ ${p.name}` : p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => launch(c.id, linkTo[c.id])}
                      disabled={!linkTo[c.id] || launching === c.id}
                      className="rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50"
                    >
                      Rattacher à cette fiche
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-2">
        {(["Tous", "A rappeler", ...RECRUITMENT_STATUSES] as const).map((s) => {
          const n = s === "Tous" ? candidates.length : s === "A rappeler" ? callbackCount : countFor(s);
          if (s !== "Tous" && s !== "A rappeler" && n === 0 && !PIPELINE_STATUSES.includes(s)) return null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                filter === s ? "border-gold bg-line text-gold-light" : "border-line bg-card text-muted"
              }`}
            >
              <span className={s === "A rappeler" && n > 0 ? "font-bold text-red" : ""}>{s === "A rappeler" ? "À rappeler" : s}</span> <span className="text-ink">{n}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucune candidature {filter === "A rappeler" ? "à rappeler" : filter !== "Tous" ? `à l'étape « ${filter} »` : "pour l'instant"}.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {visible.map((c) => (
          <CandidateCard
            key={c.id}
            c={c}
            nowIso={nowIso}
            today={today}
            isAdmin={isAdmin}
            people={people}
            interviewLink={(c.owner_id && interviewLinks[c.owner_id]) || interviewLinks[meId] || null}
            launching={launching === c.id}
            onPatch={patch}
            onLaunch={(id) => launch(id)}
            onMessage={setMessage}
          />
        ))}
      </div>
    </div>
  );
}
