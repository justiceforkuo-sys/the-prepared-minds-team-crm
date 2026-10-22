"use client";

import { useState, useTransition } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { LINKEDIN_EXPORT_URL } from "./import-panel";
import { setWeeklyGoal } from "./actions";

export interface InboundLogRow {
  id: string;
  received_at: string;
  subject: string | null;
  result: "cree" | "doublon" | "ignore" | "confirmation" | "erreur";
  detail: string | null;
}

const RESULT_LABEL: Record<InboundLogRow["result"], string> = {
  cree: "Fiche créée",
  doublon: "Déjà dans le pipeline",
  ignore: "Ignoré",
  confirmation: "Confirmation Gmail",
  erreur: "Erreur",
};

function mondayOf(today: string): string {
  const d = new Date(`${today}T12:00:00`);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STEPS = [
  { t: "Copie ton adresse de réception", d: "C'est l'adresse ci-dessus, propre à toi. Ne la partage à personne." },
  {
    t: "Gmail : Paramètres → Voir tous les paramètres → Transfert et POP/IMAP → Ajouter une adresse de transfert",
    d: "Colle ton adresse. ATTENTION : selon ton compte, Gmail active tout de suite le transfert de TOUS tes emails. Vérifie que « Désactiver le transfert » est coché, sinon coche-le et enregistre. Si Gmail demande un code de confirmation, il apparaît ici (rafraîchis la page). Outlook : Paramètres → Courrier → Règles.",
  },
  {
    t: "Crée le filtre",
    d: "Gmail : Paramètres → Filtres et adresses bloquées → Créer un filtre. Dans « De », mets invitations@linkedin.com OR notifications-noreply@linkedin.com, puis « Transférer à » ton adresse de réception.",
  },
  {
    t: "Vérifie",
    d: "À la prochaine invitation acceptée, la fiche apparaît toute seule dans ton pipeline (statut À contacter, étiquette « Nouvelle relation »). Les autres emails ne sont pas traités.",
  },
];

export function NewRelationsPanel({
  contacts,
  today,
  goal,
  readOnly,
  inbox,
  lastImportAt,
  log,
}: {
  contacts: { connected_on: string | null }[];
  today: string;
  goal: number;
  readOnly: boolean;
  inbox: string | null;
  lastImportAt: string | null;
  log: InboundLogRow[];
}) {
  const monday = mondayOf(today);
  const thisWeek = contacts.filter((c) => c.connected_on && c.connected_on >= monday && c.connected_on <= today).length;
  const [goalValue, setGoalValue] = useState(String(goal));
  const [savedGoal, setSavedGoal] = useState(goal);
  const [, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pct = savedGoal > 0 ? Math.min(100, Math.round((thisWeek / savedGoal) * 100)) : 0;

  // Rappel mensuel : dernier import avant ce mois-ci et vieux de plus de 30 jours
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastDay = lastImportAt ? new Date(lastImportAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" }) : null;
  const ageDays = lastDay ? Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${lastDay}T12:00:00`).getTime()) / 86400000) : null;
  const importDue = !readOnly && (lastDay === null || (lastDay < monthStart && (ageDays ?? 99) > 30));

  const saveGoal = () =>
    start(async () => {
      const res = await setWeeklyGoal(Number(goalValue));
      if (res.ok) {
        setSavedGoal(Number(goalValue));
        setNote("Objectif enregistré.");
      } else setNote(res.error);
    });

  const confirmations = log.filter((l) => l.result === "confirmation");

  return (
    <div className="mb-3 flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            <UserPlus size={13} /> Nouvelles relations cette semaine
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              Objectif
              <input
                value={goalValue}
                inputMode="numeric"
                onChange={(e) => setGoalValue(e.target.value.replace(/\D/g, ""))}
                onBlur={() => goalValue !== String(savedGoal) && goalValue !== "" && saveGoal()}
                className="w-12 rounded-md border border-line bg-card-alt px-1.5 py-0.5 text-center text-xs text-ink outline-none focus:border-gold"
              />
              <span>/ semaine</span>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold text-gold-light">{thisWeek}</span>
          <span className="text-sm text-muted">/ {savedGoal}</span>
          {thisWeek >= savedGoal && savedGoal > 0 && <Check size={16} className="text-[#1f8158]" />}
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        {note && <div className="mt-1 text-[11px] text-ink">{note}</div>}
      </div>

      {importDue && (
        <div className="rounded-2xl border border-gold bg-card p-3 text-xs text-ink">
          <strong>Rappel mensuel :</strong>{" "}
          {lastDay ? `ton dernier import date du ${fmtDate(lastDay)}.` : "tu n'as pas encore importé ton fichier de relations."} Télécharge ton export (case « Relations ») sur{" "}
          <a href={LINKEDIN_EXPORT_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-gold-light underline">
            LinkedIn
          </a>{" "}
          puis utilise « Mettre à jour mes relations » ci-dessous.
        </div>
      )}

      {!readOnly && inbox && (
        <details className="rounded-2xl border border-line bg-card p-3.5 text-xs">
          <summary className="cursor-pointer font-bold text-ink">
            Recevoir automatiquement mes nouvelles relations <span className="font-normal text-muted">— par email, sans rien installer sur LinkedIn</span>
          </summary>
          <p className="mt-2 text-muted">
            LinkedIn t&apos;envoie un email quand quelqu&apos;un accepte ton invitation. Transfère ces emails à ton adresse personnelle : le CRM crée la fiche tout seul. Rien
            n&apos;est lu sur ton compte LinkedIn : aucune extension, aucune automatisation.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-card-alt px-2.5 py-2">
            <code className="flex-1 break-all text-[11px] text-ink">{inbox}</code>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(inbox);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-bold text-ink"
            >
              <Copy size={12} /> {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <video src="/tutoriel-linkedin-email.mp4" controls preload="none" className="mt-3 w-full rounded-lg border border-line" />
          <div className="mt-1 text-[11px] text-muted">Vidéo de 3 minutes : toutes les étapes, pas à pas.</div>
          <ol className="mt-3 flex flex-col gap-2">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-night">{i + 1}</span>
                <span>
                  <strong className="text-ink">{s.t}</strong>
                  <span className="block text-muted">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
          {confirmations.length > 0 && (
            <div className="mt-3 rounded-lg border border-gold p-2.5">
              <div className="mb-1 font-bold text-ink">Gmail te demande de confirmer le transfert</div>
              {confirmations.slice(0, 2).map((l) => (
                <div key={l.id} className="break-all text-muted">
                  {l.detail}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 font-bold text-ink">Derniers emails reçus</div>
          {log.length === 0 ? (
            <div className="mt-1 text-muted">Aucun email reçu pour l&apos;instant.</div>
          ) : (
            <div className="mt-1 flex flex-col gap-1">
              {log.map((l) => (
                <div key={l.id} className="flex justify-between gap-2">
                  <span className="truncate text-muted">
                    {fmtDate(l.received_at)} · {l.subject ?? "(sans objet)"}
                  </span>
                  <span className={l.result === "erreur" ? "text-red" : l.result === "cree" ? "font-bold text-[#1f8158]" : "text-muted"}>{RESULT_LABEL[l.result]}</span>
                </div>
              ))}
            </div>
          )}
        </details>
      )}
    </div>
  );
}
