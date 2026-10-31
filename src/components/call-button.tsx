"use client";

import { useState, useTransition } from "react";
import { PhoneCall } from "lucide-react";
import { CALL_OUTCOMES, OUTCOME_COLOR, type CallOutcome } from "@/lib/calls";
import { enregistrerAppel } from "@/app/(app)/appels/actions";

/** Bouton « Appel » : enregistre un appel passé à un prospect avec son résultat (compté dans le suivi des appels). */
export function CallButton({ prospectId, onLogged }: { prospectId: string; onLogged: (stage: string, nextFollowUp: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const log = (outcome: CallOutcome) =>
    start(async () => {
      const res = await enregistrerAppel(prospectId, outcome, "", null);
      if (!res.ok) return setMsg(res.error);
      setMsg(`Appel enregistré : ${outcome}`);
      setOpen(false);
      onLogged(res.stage, res.nextFollowUp);
    });

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={() => setOpen((o) => !o)} disabled={pending} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink disabled:opacity-50">
        <PhoneCall size={12} /> Appel
      </button>
      {open && (
        <span className="flex max-w-[280px] flex-wrap justify-end gap-1">
          {CALL_OUTCOMES.map((o) => (
            <button
              key={o}
              type="button"
              disabled={pending}
              onClick={() => log(o)}
              className="rounded-full border px-2 py-0.5 text-[11px] font-bold disabled:opacity-50"
              style={{ borderColor: OUTCOME_COLOR[o], color: OUTCOME_COLOR[o] }}
            >
              {o}
            </button>
          ))}
        </span>
      )}
      {msg && <span className="text-[10px] text-muted">{msg}</span>}
    </span>
  );
}
