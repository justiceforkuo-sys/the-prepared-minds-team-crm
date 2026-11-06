"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, History } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { OUTCOME_COLOR, outcomesFor, type RdvKind, type RdvReport } from "@/lib/rdv";
import { enregistrerRdv, listerRdv } from "@/app/(app)/rdv/actions";
import { VoiceTextarea } from "@/components/voice-textarea";

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold";

/**
 * Compte rendu d'un rendez-vous effectué : résultat, remarque (écrite ou dictée) et prochaine étape.
 * Chaque compte rendu est conservé dans un historique (administrateurs et responsable du contact).
 * `onApplied` reçoit les changements appliqués au contact (étape, relance…) pour mettre l'écran à jour.
 */
export function RdvReportButton({
  kind,
  contactId,
  canWrite = true,
  onApplied,
}: {
  kind: RdvKind;
  contactId: string;
  canWrite?: boolean;
  onApplied?: (patch: Record<string, unknown>) => void;
}) {
  const outcomes = outcomesFor(kind);
  const [form, setForm] = useState(false);
  const [histo, setHisto] = useState(false);
  const [reports, setReports] = useState<RdvReport[] | null>(null);
  const [outcome, setOutcome] = useState<string>("");
  const [note, setNote] = useState("");
  const [voice, setVoice] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const loadHistory = () =>
    start(async () => {
      const res = await listerRdv(kind, contactId);
      if (res.ok) setReports(res.reports);
      else setMsg(res.error);
    });

  const toggleHisto = () => {
    const next = !histo;
    setHisto(next);
    if (next && reports === null) loadHistory();
  };

  const save = () =>
    start(async () => {
      if (!outcome) return setMsg("Choisis d'abord le résultat du rendez-vous.");
      const res = await enregistrerRdv({ kind, contactId, outcome, note, viaVoice: voice, nextFollowUp: followUp || null });
      if (!res.ok) return setMsg(res.error);
      setReports((r) => [res.report, ...(r ?? [])]);
      setHisto(true);
      setForm(false);
      setOutcome("");
      setNote("");
      setVoice(false);
      setFollowUp("");
      setMsg("Compte rendu enregistré.");
      onApplied?.(res.patch);
    });

  return (
    <div className="mt-2 flex flex-col gap-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {canWrite && (
          <button type="button" onClick={() => setForm((f) => !f)} className="flex items-center gap-1 rounded-md border border-gold px-2.5 py-1 font-bold text-gold-light">
            <CalendarCheck size={12} /> Rendez-vous effectué
          </button>
        )}
        <button type="button" onClick={toggleHisto} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-ink">
          <History size={12} /> Comptes rendus{reports ? ` (${reports.length})` : ""}
        </button>
      </div>

      {form && (
        <div className="flex flex-col gap-2 rounded-xl border border-gold bg-card p-2.5">
          <div className="flex flex-wrap gap-1">
            {outcomes.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
                style={outcome === o ? { background: OUTCOME_COLOR[o], borderColor: OUTCOME_COLOR[o], color: "#fff" } : { borderColor: OUTCOME_COLOR[o], color: OUTCOME_COLOR[o] }}
              >
                {o}
              </button>
            ))}
          </div>
          <VoiceTextarea value={note} onChange={setNote} onVoiceUsed={() => setVoice(true)} placeholder="Remarque : comment s'est passé le rendez-vous ? Écris ou appuie sur le micro pour dicter." rows={4} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-muted">
              Prochaine relance
              <input type="date" value={followUp} min="2020-01-01" max="2100-12-31" onChange={(e) => setFollowUp(e.target.value)} className={inputCls} />
            </label>
            <button type="button" disabled={pending} onClick={save} className="rounded-md bg-gold px-3 py-1 font-bold text-night disabled:opacity-50">
              Enregistrer le compte rendu
            </button>
          </div>
        </div>
      )}

      {histo && (
        <div className="flex flex-col gap-1">
          {reports === null ? (
            <span className="text-muted">Chargement…</span>
          ) : reports.length === 0 ? (
            <span className="text-muted">Aucun compte rendu pour l&apos;instant.</span>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="rounded-lg border border-line bg-card-alt p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold" style={{ color: OUTCOME_COLOR[r.outcome] }}>
                    {r.outcome}
                  </span>
                  <span className="text-[11px] text-muted">
                    {fmtDate(r.happened_on)} · {r.author_name}
                    {r.via_voice ? " · dicté" : ""}
                  </span>
                </div>
                {r.note && <div className="mt-1 whitespace-pre-wrap text-ink">{r.note}</div>}
                {r.next_follow_up && <div className="mt-1 text-[11px] text-muted">Relance prévue le {fmtDate(r.next_follow_up)}</div>}
              </div>
            ))
          )}
        </div>
      )}
      {msg && <div className="text-[11px] text-ink">{msg}</div>}
    </div>
  );
}
