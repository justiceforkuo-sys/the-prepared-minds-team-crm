"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, ExternalLink, Send } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { GROUPS, GROUP_LABEL, STATUS_COLOR, STEP_LABEL, afterSend, stepFor } from "@/lib/linkedin/status";
import { CALENDLY_PLACEHOLDER, renderMessage, templateFor } from "@/lib/linkedin/messages";
import { DAILY_LIMIT, LINKEDIN_STATUSES, type LinkedinContact, type LinkedinGroup, type LinkedinStatus } from "@/lib/linkedin/types";

export type Outcome = "reply" | "rdv" | "client" | "later" | "notInterested";

const PRIORITY_COLOR: Record<number, string> = { 1: "#d9534f", 2: "#e0b93a", 3: "#8a97b0" };

function MessageBox({
  initial,
  step,
  contact,
  readOnly,
  sentToday,
  forcing,
  onSend,
}: {
  initial: string;
  step: keyof typeof STEP_LABEL;
  contact: LinkedinContact;
  readOnly: boolean;
  sentToday: number;
  forcing: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);
  const overLimit = sentToday >= DAILY_LIMIT;
  const effect = afterSend(contact.status);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">{STEP_LABEL[step]}</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-gold"
      />
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
        <span>{text.length} caractères</span>
        {text.includes(CALENDLY_PLACEHOLDER) && <span className="text-red">Ajoute ton lien Calendly en haut de la page.</span>}
        {text.length > 600 && <span>Message long : les messages courts obtiennent plus de réponses.</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink"
        >
          <Copy size={13} /> {copied ? "Copié" : "Copier le message"}
        </button>
        <a
          href={contact.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink"
        >
          <ExternalLink size={13} /> Ouvrir le profil LinkedIn
        </a>
        {!readOnly && effect && (
          <button
            onClick={() => onSend(text)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-night ${
              forcing ? "bg-red text-white" : "bg-gold"
            }`}
          >
            <Send size={13} /> {forcing ? "Envoyer quand même" : "J'ai envoyé"}
          </button>
        )}
      </div>
      {overLimit && !readOnly && effect && (
        <div className="mt-1.5 text-[11px] text-red">
          {DAILY_LIMIT}{" "}messages aujourd&apos;hui : garde le reste pour demain.
          {forcing ? " Clique encore une fois pour forcer." : ""}
        </div>
      )}
    </div>
  );
}

export function ContactCard({
  contact,
  today,
  open,
  readOnly,
  sentToday,
  forcing,
  collaboratorName,
  calendlyUrl,
  onToggle,
  onSend,
  onOutcome,
  onPatch,
  onCreateProspect,
}: {
  contact: LinkedinContact;
  today: string;
  open: boolean;
  readOnly: boolean;
  sentToday: number;
  forcing: boolean;
  collaboratorName: string;
  calendlyUrl: string | null;
  onToggle: () => void;
  onSend: (text: string) => void;
  onOutcome: (o: Outcome) => void;
  onPatch: (patch: Partial<LinkedinContact>, eventAction?: string) => void;
  onCreateProspect: () => void;
}) {
  const [note, setNote] = useState(contact.note);
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();
  const subtitle = [contact.position, contact.company].filter(Boolean).join(" · ");
  const late = contact.next_action !== null && contact.next_action < today;
  const step = stepFor(contact.status, contact.grp);
  const template = step ? templateFor(contact.grp, step) : null;
  const rendered =
    step && template
      ? renderMessage(template, {
          firstName: contact.first_name,
          company: contact.company,
          grp: contact.grp,
          collaboratorName,
          calendlyUrl,
        })
      : null;

  return (
    <div className="rounded-2xl border border-line bg-card">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left">
        <span
          className="flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
          style={{ background: PRIORITY_COLOR[contact.priority] }}
        >
          P{contact.priority}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{fullName}</div>
          <div className="truncate text-xs text-muted">{subtitle || "—"}</div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ background: STATUS_COLOR[contact.status] }}
          >
            {contact.status}
          </span>
          {contact.next_action && (
            <span className={`text-[10px] font-bold ${late ? "text-[#e08a3a]" : "text-muted"}`}>
              {fmtDate(contact.next_action)}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="flex-shrink-0 text-muted" /> : <ChevronDown size={16} className="flex-shrink-0 text-muted" />}
      </button>

      {open && (
        <div className="border-t border-line p-3">
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded-full border border-line px-2 py-0.5 font-bold text-gold-light">
              {contact.grp} · {GROUP_LABEL[contact.grp]}
            </span>
            {contact.tags.map((t) => (
              <span key={t} className="rounded-full border border-line px-2 py-0.5 text-muted">
                {t}
              </span>
            ))}
            {contact.connected_on && (
              <span className="rounded-full border border-line px-2 py-0.5 text-muted">Connecté le {fmtDate(contact.connected_on)}</span>
            )}
            <span className="rounded-full border border-line px-2 py-0.5 text-muted">
              {contact.msgs_sent} envoyé{contact.msgs_sent > 1 ? "s" : ""} · {contact.msgs_received} reçu
              {contact.msgs_received > 1 ? "s" : ""}
            </span>
          </div>

          {contact.note && (
            <div
              className="mt-2 whitespace-pre-wrap rounded-lg border px-3 py-2 text-xs text-ink"
              style={{ background: "rgba(245,205,84,0.15)", borderColor: "rgba(245,205,84,0.4)" }}
            >
              {contact.note}
            </div>
          )}

          {rendered && step && (
            <MessageBox
              key={`${contact.id}-${step}-${contact.grp}`}
              initial={rendered}
              step={step}
              contact={contact}
              readOnly={readOnly}
              sentToday={sentToday}
              forcing={forcing}
              onSend={onSend}
            />
          )}
          {!rendered && (
            <div className="mt-3 rounded-lg border border-line bg-card-alt p-2.5 text-xs text-muted">
              {contact.grp === "E"
                ? "Équipe & réseau : on entretient, on ne prospecte pas — aucun message proposé."
                : contact.grp === "F"
                  ? "Range cette personne dans un groupe pour obtenir son message."
                  : "Aucun message à envoyer pour ce statut."}
            </div>
          )}

          {!readOnly && (
            <>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(
                  [
                    ["reply", "A répondu"],
                    ["rdv", "RDV fixé"],
                    ["client", "Client / partenaire"],
                    ["later", "Plus tard (3 mois)"],
                    ["notInterested", "Pas intéressé"],
                  ] as [Outcome, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => onOutcome(key)}
                    className="rounded-lg border border-line bg-card-alt px-2.5 py-1 text-[11px] font-bold text-ink"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {contact.status === "RDV fixé" && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-line bg-card-alt p-2.5 text-xs">
                  {contact.prospect_id ? (
                    <span className="text-green">Prospect créé dans le CRM.</span>
                  ) : (
                    <>
                      <span className="text-ink">Créer le prospect dans le CRM (source : LinkedIn) ?</span>
                      <button onClick={onCreateProspect} className="flex-shrink-0 rounded-md bg-gold px-2.5 py-1 text-[11px] font-bold text-night">
                        Créer le prospect
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="text-[10px] text-muted">
                  Groupe
                  <select
                    value={contact.grp}
                    onChange={(e) => onPatch({ grp: e.target.value as LinkedinGroup })}
                    className="mt-0.5 w-full rounded-md border border-line bg-card-alt px-1.5 py-1 text-xs text-ink outline-none focus:border-gold"
                  >
                    {GROUPS.map((g) => (
                      <option key={g.code} value={g.code}>
                        {g.code} · {g.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] text-muted">
                  Priorité
                  <select
                    value={contact.priority}
                    onChange={(e) => onPatch({ priority: Number(e.target.value) as 1 | 2 | 3 })}
                    className="mt-0.5 w-full rounded-md border border-line bg-card-alt px-1.5 py-1 text-xs text-ink outline-none focus:border-gold"
                  >
                    <option value={1}>P1</option>
                    <option value={2}>P2</option>
                    <option value={3}>P3</option>
                  </select>
                </label>
                <label className="text-[10px] text-muted">
                  Statut
                  <select
                    value={contact.status}
                    onChange={(e) => onPatch({ status: e.target.value as LinkedinStatus }, `Statut : ${e.target.value}`)}
                    className="mt-0.5 w-full rounded-md border border-line bg-card-alt px-1.5 py-1 text-xs text-ink outline-none focus:border-gold"
                  >
                    {LINKEDIN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          <label className="mt-3 block text-[10px] text-muted">
            Notes
            <textarea
              value={note}
              readOnly={readOnly}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => {
                if (!readOnly && note !== contact.note) onPatch({ note });
              }}
              rows={3}
              placeholder="Ce que tu sais de cette personne…"
              className="mt-0.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </label>
        </div>
      )}
    </div>
  );
}
