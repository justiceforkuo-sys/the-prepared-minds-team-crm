"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb, Mic, Square, X } from "lucide-react";
import { loadQueue, newIdeeId, saveQueue, type IdeeSource, type QueuedIdee } from "@/lib/idees";
import { saveIdea } from "@/app/(app)/idees/actions";

// Bloc 8 — bouton flottant « Idée », visible sur toutes les pages. Règle : ne jamais faire confiance à sa mémoire.
// 1) dictée par la reconnaissance vocale du navigateur (fr-BE) ; 2) à défaut, enregistrement audio transcrit côté serveur ;
// 3) saisie texte toujours possible. L'idée est écrite dans une file locale AVANT tout envoi : rien ne se perd, même hors ligne.

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function IdeaCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [mode, setMode] = useState<"idle" | "speech" | "record" | "transcribing">("idle");
  const [source, setSource] = useState<IdeeSource>("texte");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const recRef = useRef<SR | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const syncing = useRef(false);

  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      let queue = loadQueue();
      for (const item of queue) {
        if (typeof navigator !== "undefined" && !navigator.onLine) break;
        try {
          const res = await saveIdea({ id: item.id, texte: item.texte, source: item.source, cree_le: item.cree_le });
          if (res.ok) {
            queue = loadQueue().filter((q) => q.id !== item.id);
            saveQueue(queue);
          } else if (/Session expirée/.test(res.error)) {
            break; // l'idée reste dans la file : elle partira à la prochaine connexion
          } else if (/Idée vide|invalide/i.test(res.error)) {
            saveQueue(loadQueue().filter((q) => q.id !== item.id)); // élément inutilisable : on le retire pour ne pas bloquer la file
          } else {
            break;
          }
        } catch {
          break; // réseau coupé : on réessaiera
        }
      }
    } finally {
      syncing.current = false;
      setPendingCount(loadQueue().length);
    }
  }, []);

  useEffect(() => {
    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    const onOpen = () => setOpen(true);
    window.addEventListener("pmt:capture-idee", onOpen);
    // Raccourci de l'application installée : /idees?capture=1 ouvre directement la capture
    if (new URLSearchParams(window.location.search).get("capture") === "1") window.dispatchEvent(new Event("pmt:capture-idee"));
    // Le service worker hors ligne enregistre dans la même file : on resynchronise quand on revient au premier plan
    const onVisible = () => document.visibilityState === "visible" && void sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pmt:capture-idee", onOpen);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const stopAll = () => {
    recRef.current?.stop();
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
  };

  const startSpeech = () => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "fr-BE";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finals = "";
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += r[0].transcript;
        else partial += r[0].transcript;
      }
      if (finals) setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${finals.trim()}`);
      setInterim(partial);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") setMsg("Micro refusé : autorise-le dans le navigateur, ou écris ton idée.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setMsg("La dictée s'est interrompue : tu peux continuer à écrire.");
    };
    rec.onend = () => {
      setInterim("");
      setMode("idle");
    };
    recRef.current = rec;
    setSource("voix");
    setMsg(null);
    setMode("speech");
    rec.start();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setMode("transcribing");
        try {
          const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
          const form = new FormData();
          form.set("audio", blob, `idee.${(mr.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm"}`);
          const res = await fetch("/api/idees/transcrire", { method: "POST", body: form });
          const json = (await res.json()) as { text?: string; error?: string };
          if (res.ok && json.text) setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${json.text}`);
          else setMsg(json.error ?? "La transcription a échoué : écris ton idée.");
        } catch {
          setMsg("Pas de réseau pour transcrire : écris ton idée, elle sera enregistrée quand même.");
        }
        setMode("idle");
      };
      mediaRef.current = mr;
      setSource("voix");
      setMsg(null);
      setMode("record");
      mr.start();
      setTimeout(() => mr.state !== "inactive" && mr.stop(), 60000);
    } catch {
      setMsg("Micro indisponible ou refusé : écris ton idée.");
    }
  };

  const toggleMic = () => {
    if (mode === "speech" || mode === "record") return stopAll();
    const canRecord = typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    if (speechCtor()) startSpeech();
    else if (canRecord) void startRecording();
    else setMsg("Dictée indisponible sur cet appareil : écris ton idée.");
  };

  const submit = async () => {
    stopAll();
    const texte = `${text} ${interim}`.trim();
    if (!texte) return;
    const item: QueuedIdee = { id: newIdeeId(), texte, source, cree_le: new Date().toISOString() };
    saveQueue([...loadQueue(), item]); // d'abord sur le téléphone : rien ne se perd
    setText("");
    setInterim("");
    setSource("texte");
    setPendingCount(loadQueue().length);
    setMsg(navigator.onLine ? "Idée enregistrée ✓" : "Idée gardée sur ton téléphone : elle sera envoyée au retour du réseau ✓");
    setOpen(false);
    void sync();
    setTimeout(() => setMsg(null), 3500);
  };

  const listening = mode === "speech" || mode === "record";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Capturer une idée"
        className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 rounded-full bg-gold px-4 py-3 text-sm font-bold text-night shadow-lg md:bottom-6 md:right-6"
      >
        <Mic size={18} /> Idée
        {pendingCount > 0 && <span className="ml-1 rounded-full bg-night px-1.5 text-[10px] text-gold">{pendingCount}</span>}
      </button>

      {msg && !open && (
        <div className="fixed bottom-36 right-4 z-40 max-w-[16rem] rounded-xl border border-gold bg-card px-3 py-2 text-xs text-ink shadow-lg md:bottom-20 md:right-6">{msg}</div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4" onClick={() => !listening && setOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl border border-line bg-card p-4 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-serif text-lg font-semibold text-ink">
                <Lightbulb size={18} className="text-gold" /> Capture ton idée
              </div>
              <button
                onClick={() => {
                  stopAll();
                  setOpen(false);
                }}
                aria-label="Fermer"
                className="text-muted"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-2 text-[11px] text-muted">Même un seul mot. Ne fais jamais confiance à ta mémoire : dicte ou écris, on range ensuite.</p>
            <textarea
              value={interim ? `${text}${text ? " " : ""}${interim}` : text}
              onChange={(e) => {
                setText(e.target.value);
                setInterim("");
              }}
              rows={5}
              autoFocus
              placeholder={listening ? "Je t'écoute…" : "Écris ou dicte ton idée…"}
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
            {msg && <div className="mt-1 text-xs text-ink">{msg}</div>}
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                onClick={toggleMic}
                disabled={mode === "transcribing"}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold ${listening ? "border-red bg-red text-white" : "border-gold text-gold-light"} disabled:opacity-50`}
              >
                {listening ? <Square size={16} /> : <Mic size={16} />}
                {mode === "transcribing" ? "Transcription…" : listening ? "Arrêter" : "Dicter"}
              </button>
              <button onClick={submit} disabled={!`${text} ${interim}`.trim()} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-night disabled:opacity-50">
                Enregistrer
              </button>
            </div>
            {pendingCount > 0 && <div className="mt-2 text-[11px] text-muted">{pendingCount} idée{pendingCount > 1 ? "s" : ""} en attente d&apos;envoi (hors ligne) : envoi automatique au retour du réseau.</div>}
          </div>
        </div>
      )}
    </>
  );
}
