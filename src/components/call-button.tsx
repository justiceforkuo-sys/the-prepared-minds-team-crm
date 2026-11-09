"use client";

import { useRef, useState, useTransition } from "react";
import { Phone, PhoneCall } from "lucide-react";
import { ASK_OBJECTION, CALL_OUTCOMES, OUTCOME_COLOR, type CallOutcome } from "@/lib/calls";
import { chargerObjections, enregistrerAppel, noterObjection, type ObjectionChoix } from "@/app/(app)/appels/actions";

/** Lien d'appel `tel:` : sur le téléphone, ouvre le composeur ; sur le PC, Phone Link (Windows) fait sonner le téléphone. */
export function dialHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 6 ? `tel:${digits}` : null;
}

type Step = { kind: "result" } | { kind: "objection"; callId: string } | { kind: "reponse"; libelle: string; reponse: string | null };

/**
 * Bouton « Appeler » : lance l'appel sur le téléphone, puis propose tout de suite le résultat de l'appel
 * (répondu, pas de réponse, RDV pris…), qui est enregistré et compté dans le suivi des appels.
 * Après un appel joint sans RDV, un second clic note l'objection entendue (banque de l'équipe) et rappelle la réponse de l'équipe.
 * Sans numéro, le bouton « Appel » sert seulement à enregistrer un appel déjà passé.
 */
export function CallButton({ prospectId, phone, onLogged }: { prospectId: string; phone?: string | null; onLogged: (stage: string, nextFollowUp: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [step, setStep] = useState<Step>({ kind: "result" });
  const [bank, setBank] = useState<ObjectionChoix[] | null>(null);
  const [autre, setAutre] = useState(false);
  const [mots, setMots] = useState("");
  // La mise à jour de la carte (étape, relance) est différée jusqu'à la fin de l'étape « objection » : la carte peut changer de colonne
  const pendingLog = useRef<{ stage: string; nextFollowUp: string | null } | null>(null);
  const href = dialHref(phone);

  const finish = () => {
    setOpen(false);
    setStep({ kind: "result" });
    setAutre(false);
    setMots("");
    const p = pendingLog.current;
    pendingLog.current = null;
    if (p) onLogged(p.stage, p.nextFollowUp);
  };

  const log = (outcome: CallOutcome) =>
    start(async () => {
      const res = await enregistrerAppel(prospectId, outcome, "", null);
      if (!res.ok) return setMsg(res.error);
      setMsg(`Appel enregistré : ${outcome}`);
      if ((ASK_OBJECTION as string[]).includes(outcome)) {
        pendingLog.current = { stage: res.stage, nextFollowUp: res.nextFollowUp };
        setStep({ kind: "objection", callId: res.callId });
        if (bank === null) setBank(await chargerObjections());
        return;
      }
      setOpen(false);
      onLogged(res.stage, res.nextFollowUp);
    });

  const note = (callId: string, choix: ObjectionChoix | null, words: string) =>
    start(async () => {
      const res = await noterObjection(callId, choix?.id ?? null, words);
      if (!res.ok) return setMsg(res.error);
      setMsg(null);
      setStep({ kind: "reponse", libelle: choix?.libelle ?? "Autre", reponse: res.reponse });
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

      {open && step.kind === "result" && (
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

      {open && step.kind === "objection" && (
        <span className="flex max-w-[300px] flex-col items-end gap-1">
          <span className="text-[10px] text-muted">Quelle objection as-tu entendue ? (facultatif)</span>
          <span className="flex flex-wrap justify-end gap-1">
            {(bank ?? []).map((o) => (
              <button key={o.id} type="button" disabled={pending} onClick={() => note(step.callId, o, "")} className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-ink disabled:opacity-50">
                {o.libelle}
              </button>
            ))}
            <button type="button" onClick={() => setAutre((a) => !a)} className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-ink">
              Autre
            </button>
            <button type="button" onClick={finish} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
              Passer
            </button>
          </span>
          {bank === null && <span className="text-[10px] text-muted">Chargement…</span>}
          {autre && (
            <span className="flex w-full flex-col items-end gap-1">
              <input value={mots} onChange={(e) => setMots(e.target.value)} maxLength={200} placeholder="Ses mots exacts, sans nom" className="w-full rounded-md border border-line bg-card-alt px-2 py-1 text-[11px] text-ink outline-none focus:border-gold" />
              <button type="button" disabled={pending || mots.trim().length < 3} onClick={() => note(step.callId, null, mots)} className="rounded-md bg-gold px-2 py-0.5 text-[11px] font-bold text-night disabled:opacity-50">
                Enregistrer
              </button>
            </span>
          )}
        </span>
      )}

      {open && step.kind === "reponse" && (
        <span className="flex max-w-[300px] flex-col items-end gap-1 rounded-lg border border-line bg-card-alt p-2 text-left text-[11px] text-ink">
          <span className="font-bold">Objection : {step.libelle}</span>
          {step.reponse ? (
            <>
              <span className="text-muted">Réponse de l&apos;équipe, à dire avec tes propres mots :</span>
              <span>{step.reponse}</span>
            </>
          ) : (
            <span className="text-muted">Noté. Pas encore de réponse validée pour cette objection.</span>
          )}
          <span className="text-[10px] text-muted">Une objection est une information sur le client, pas un mur à abattre.</span>
          <button type="button" onClick={finish} className="rounded-md bg-gold px-2 py-0.5 text-[11px] font-bold text-night">
            OK
          </button>
        </span>
      )}
      {msg && <span className="text-[10px] text-muted">{msg}</span>}
    </span>
  );
}
