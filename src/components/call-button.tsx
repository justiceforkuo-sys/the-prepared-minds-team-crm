"use client";

import { useState, useTransition } from "react";
import { Phone, PhoneCall } from "lucide-react";
import { CALL_OUTCOMES, OUTCOME_COLOR, type CallOutcome } from "@/lib/calls";
import { enregistrerAppel } from "@/app/(app)/appels/actions";

/** Lien d'appel `tel:` : sur le téléphone, ouvre le composeur ; sur le PC, Phone Link (Windows) fait sonner le téléphone. */
export function dialHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 6 ? `tel:${digits}` : null;
}

/**
 * Bouton « Appeler » : lance l'appel sur le téléphone, puis propose tout de suite le résultat de l'appel
 * (répondu, pas de réponse, RDV pris…), qui est enregistré et compté dans le suivi des appels.
 * Sans numéro, le bouton « Appel » sert seulement à enregistrer un appel déjà passé.
 */
export function CallButton({ prospectId, phone, onLogged }: { prospectId: string; phone?: string | null; onLogged: (stage: string, nextFollowUp: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const href = dialHref(phone);

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
      {href ? (
        <a href={href} onClick={() => setOpen(true)} className="flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night">
          <Phone size={12} /> Appeler
        </a>
      ) : (
        <button type="button" onClick={() => setOpen((o) => !o)} disabled={pending} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink disabled:opacity-50">
          <PhoneCall size={12} /> Appel
        </button>
      )}
      {open && (
        <span className="flex max-w-[300px] flex-col items-end gap-1">
          <span className="text-[10px] text-muted">{href ? "Appel lancé : choisis le résultat" : "Résultat de l'appel"}</span>
          <span className="flex flex-wrap justify-end gap-1">
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
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
              Fermer
            </button>
          </span>
        </span>
      )}
      {msg && <span className="text-[10px] text-muted">{msg}</span>}
    </span>
  );
}
