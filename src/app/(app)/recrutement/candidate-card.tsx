"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, PhoneCall, UserCheck } from "lucide-react";
import { fmtDate } from "@/lib/format";
import {
  ELIGIBILITY_OPTIONS,
  HOURS_OPTIONS,
  INCOME_OPTIONS,
  PIPELINE_STATUSES,
  SCORE_COLOR,
  SCORE_TAG,
  STATUS_COLOR,
  ageOn,
  labelOf,
  needsCallback,
  waitingLabel,
  waitingTone,
  type RecruitmentRow,
  type RecruitmentStatus,
} from "@/lib/recruitment";

export type CandidateRowData = RecruitmentRow & {
  recruiter: { name: string } | null;
  owner: { name: string } | null;
};

const REJECT_REASONS = ["Profil non adapté", "Motivation insuffisante", "Disponibilité insuffisante", "Pas éligible"];
const NO_FOLLOW_REASONS = ["Ne répond plus", "A abandonné", "Pas le bon moment", "Injoignable"];

const inputCls = "rounded-md border border-line bg-card px-2 py-1 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
}

type Panel = null | "call" | "interview" | "reject" | "nofollow";

export function CandidateCard({
  c,
  nowIso,
  today,
  isAdmin,
  people,
  interviewLink,
  launching,
  onPatch,
  onLaunch,
  onMessage,
}: {
  c: CandidateRowData;
  nowIso: string;
  today: string;
  isAdmin: boolean;
  people: { id: string; name: string }[];
  interviewLink: string | null;
  launching: boolean;
  onPatch: (id: string, patch: Partial<RecruitmentRow>) => void;
  onLaunch: (id: string) => void;
  onMessage: (text: string) => void;
}) {
  const now = new Date(nowIso);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [callDate, setCallDate] = useState("");
  const [interviewAt, setInterviewAt] = useState(toLocalInput(c.interview_at));
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);
  const [action, setAction] = useState(c.next_action ?? "");
  const [actionDate, setActionDate] = useState(c.next_action_date ?? "");

  const age = c.birthdate ? ageOn(c.birthdate, now) : null;
  const isNew = c.status === "Nouveau";
  const tone = isNew ? waitingTone(c.created_at, now) : "ok";
  const toneCls = tone === "late" ? "font-bold text-red" : tone === "warn" ? "font-bold text-[#e08a3a]" : "text-muted";
  const overdue = c.next_action_date !== null && c.next_action_date <= today && PIPELINE_STATUSES.slice(0, 4).includes(c.status);
  const callback = needsCallback(c, today, now);
  const closed = c.status === "Rejeté" || c.status === "Sans suite" || c.status === "Non éligible";

  const personalLink = (() => {
    if (!interviewLink) return null;
    try {
      const url = new URL(interviewLink);
      url.searchParams.set("name", c.name);
      if (c.email) url.searchParams.set("email", c.email);
      return url.toString();
    } catch {
      return interviewLink;
    }
  })();

  const confirmCall = () => {
    onPatch(c.id, {
      status: c.status === "Nouveau" ? "Contacté" : c.status,
      next_action_date: callDate || null,
      next_action: callDate ? c.next_action || "Relancer" : null,
    });
    setAction(c.next_action || (callDate ? "Relancer" : ""));
    setActionDate(callDate);
    setPanel(null);
    setCallDate("");
  };

  const copyLink = async () => {
    if (!personalLink) {
      onMessage("Ajoute d'abord ton lien Calendly « Entretien de Recrutement » en haut de la page.");
      return;
    }
    await navigator.clipboard.writeText(personalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmInterview = () => {
    if (!interviewAt) return;
    onPatch(c.id, { status: "Entretien planifié", interview_at: new Date(interviewAt).toISOString(), next_action: "Faire l'entretien", next_action_date: interviewAt.slice(0, 10) });
    setAction("Faire l'entretien");
    setActionDate(interviewAt.slice(0, 10));
    setPanel(null);
  };

  const confirmExit = (status: "Rejeté" | "Sans suite") => {
    onPatch(c.id, { status, status_reason: reason.trim() || null, next_action: null, next_action_date: null });
    setAction("");
    setActionDate("");
    setPanel(null);
    setReason("");
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-3.5" style={{ borderLeft: `3px solid ${STATUS_COLOR[c.status]}` }}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-2 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {c.score_label ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-night"
                style={{ background: SCORE_COLOR[c.score_label] }}
                title={`Score ${c.score}`}
              >
                {SCORE_TAG[c.score_label]}
              </span>
            ) : null}
            <span className="text-sm font-bold text-ink">{c.name}</span>
            {callback && <span className="rounded-full border border-red px-1.5 py-0.5 text-[9px] font-bold text-red">À rappeler</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            <span style={{ color: STATUS_COLOR[c.status] }} className="font-bold">
              {c.status}
            </span>
            {isNew ? (
              <span className={toneCls}>· En attente depuis {waitingLabel(c.created_at, now)}</span>
            ) : !closed ? (
              <span>· dans l&apos;étape depuis {waitingLabel(c.stage_changed_at, now)}</span>
            ) : null}
            {c.owner && (isAdmin || c.owner_id !== c.recruiter_id) && <span>· responsable : {c.owner.name}</span>}
            <span>· reçue le {fmtDate(c.created_at)}</span>
          </div>
          {(c.next_action || c.interview_at) && !closed && (
            <div className={`mt-0.5 text-xs ${overdue ? "font-bold text-red" : "text-ink"}`}>
              {c.interview_at ? `📅 Entretien ${fmtDateTime(c.interview_at)}` : ""}
              {c.interview_at && c.next_action ? " · " : ""}
              {c.next_action ? `➜ ${c.next_action}${c.next_action_date ? ` (${fmtDate(c.next_action_date)})` : ""}` : ""}
            </div>
          )}
          {closed && c.status_reason && <div className="mt-0.5 text-xs text-muted">Motif : {c.status_reason}</div>}
        </div>
        {open ? <ChevronUp size={16} className="flex-shrink-0 text-muted" /> : <ChevronDown size={16} className="flex-shrink-0 text-muted" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 text-xs">
          {!closed && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setPanel(panel === "call" ? null : "call")} className={goldBtn}>
                  <PhoneCall size={13} /> Appelé
                </button>
                <button onClick={copyLink} className={ghostBtn}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Lien copié" : "Envoyer le lien d'entretien"}
                </button>
                <button onClick={() => setPanel(panel === "interview" ? null : "interview")} className={ghostBtn}>
                  Entretien le…
                </button>
                {c.status === "Retenu" && (
                  <button onClick={() => onLaunch(c.id)} disabled={launching} className={goldBtn}>
                    <UserCheck size={13} /> {launching ? "Création…" : "Retenu → lancer l'onboarding"}
                  </button>
                )}
                {c.status === "Entretien planifié" && (
                  <button onClick={() => onPatch(c.id, { status: "Retenu", next_action: "Lancer l'onboarding", next_action_date: today })} className={ghostBtn}>
                    Marquer retenu
                  </button>
                )}
                {c.status === "Intégré" && (
                  <button onClick={() => onPatch(c.id, { status: "Actif 90 j" })} className={ghostBtn}>
                    Actif à 90 jours
                  </button>
                )}
                <button onClick={() => setPanel(panel === "reject" ? null : "reject")} className={ghostBtn}>
                  Rejeter
                </button>
                <button onClick={() => setPanel(panel === "nofollow" ? null : "nofollow")} className={ghostBtn}>
                  Sans suite
                </button>
              </div>

              {panel === "call" && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-card-alt p-2">
                  <span className="text-muted">Prochaine date de suivi :</span>
                  <input type="date" min={today} value={callDate} onChange={(e) => setCallDate(e.target.value)} className={inputCls} />
                  <button onClick={confirmCall} className={goldBtn}>
                    Valider
                  </button>
                  <span className="text-[11px] text-muted">{c.status === "Nouveau" ? "Le statut passe à « Contacté »." : ""}</span>
                </div>
              )}

              {panel === "interview" && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-card-alt p-2">
                  <span className="text-muted">Date et heure :</span>
                  <input type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} className={inputCls} />
                  <button onClick={confirmInterview} disabled={!interviewAt} className={goldBtn}>
                    Planifier
                  </button>
                </div>
              )}

              {(panel === "reject" || panel === "nofollow") && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-card-alt p-2">
                  <span className="text-muted">Motif :</span>
                  <input
                    list={`reasons-${c.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Choisis ou écris un motif"
                    className={`${inputCls} min-w-[14rem]`}
                  />
                  <datalist id={`reasons-${c.id}`}>
                    {(panel === "reject" ? REJECT_REASONS : NO_FOLLOW_REASONS).map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                  <button onClick={() => confirmExit(panel === "reject" ? "Rejeté" : "Sans suite")} disabled={!reason.trim()} className={goldBtn}>
                    Confirmer
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-muted">
              Responsable
              <select
                value={c.owner_id ?? ""}
                onChange={(e) => onPatch(c.id, { owner_id: e.target.value || null })}
                className={inputCls}
              >
                <option value="">Sans responsable</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-muted">
              Étape
              <select
                value={c.status}
                onChange={(e) => onPatch(c.id, { status: e.target.value as RecruitmentStatus })}
                className={inputCls}
                style={{ color: STATUS_COLOR[c.status] }}
              >
                {(PIPELINE_STATUSES.includes(c.status) ? PIPELINE_STATUSES : [...PIPELINE_STATUSES, c.status]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-muted">
              Prochaine action
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                onBlur={() => action !== (c.next_action ?? "") && onPatch(c.id, { next_action: action.trim() || null })}
                placeholder="Ex. Rappeler, proposer un créneau…"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-muted">
              Date de la prochaine action
              <input
                type="date"
                value={actionDate}
                onChange={(e) => {
                  setActionDate(e.target.value);
                  onPatch(c.id, { next_action_date: e.target.value || null });
                }}
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 text-ink sm:grid-cols-2">
            {c.phone && <div>📞 {c.phone}</div>}
            {c.email && <div>✉️ {c.email}</div>}
            {c.city && <div>Ville : {c.city}</div>}
            {age !== null && <div className={age < 21 ? "font-bold text-red" : ""}>Âge : {age} ans{age < 21 ? " (< 21 ans)" : ""}</div>}
            {c.eligibility && (
              <div className={c.eligible === false ? "font-bold text-red" : ""}>
                Éligibilité : {labelOf(ELIGIBILITY_OPTIONS, c.eligibility)}
              </div>
            )}
            {!c.eligibility && c.nationality && <div>Nationalité : {c.nationality}</div>}
            {c.current_situation && <div>Situation : {c.current_situation}</div>}
            <div className={c.has_cess === false ? "font-bold text-red" : ""}>CESS : {c.has_cess === null ? "—" : c.has_cess ? "Oui" : "Non"}</div>
            {c.hours_per_week && <div>Disponibilité : {labelOf(HOURS_OPTIONS, c.hours_per_week)} par semaine</div>}
            {c.income_goal && <div>Objectif à 12 mois : {labelOf(INCOME_OPTIONS, c.income_goal)} / mois</div>}
            {c.sales_experience !== null && (
              <div>
                Expérience de contact : {c.sales_experience ? "Oui" : "Non"}
                {c.sales_experience_note ? ` — ${c.sales_experience_note}` : ""}
              </div>
            )}
            {c.french_level && <div>Français : {c.french_level}</div>}
            {c.english_level && <div>Anglais : {c.english_level}</div>}
            {c.dutch_level && <div>Néerlandais : {c.dutch_level}</div>}
            {c.availability_confirmed !== null && <div>Créneaux de formation : {c.availability_confirmed ? "confirmés" : "non confirmés"}</div>}
            {c.referral_source && <div>Source : {c.referral_source}</div>}
            {c.score !== null && <div>Score : {c.score}</div>}
          </div>
          {c.motivation && (
            <div className="rounded-lg border border-line bg-card-alt p-2 text-ink">
              <div className="mb-0.5 text-[11px] text-muted">Motivation</div>
              {c.motivation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
