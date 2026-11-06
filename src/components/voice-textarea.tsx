"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

// Zone de texte avec micro : dictée par la reconnaissance vocale du navigateur (fr-BE) ; à défaut, enregistrement audio
// transcrit côté serveur (même service que « Mes idées », audio oublié aussitôt). On peut toujours écrire à la main.

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

const join = (base: string, add: string) => `${base}${base && !/\s$/.test(base) ? " " : ""}${add.trim()}`;

export function VoiceTextarea({
  value,
  onChange,
  onVoiceUsed,
  placeholder,
  rows = 4,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onVoiceUsed?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const [mode, setMode] = useState<"idle" | "speech" | "record" | "transcribing">("idle");
  const [interim, setInterim] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const recRef = useRef<SR | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);

  const append = (text: string) => onChange(join(valueRef.current, text));

  const startSpeech = (Ctor: new () => SR) => {
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
      if (finals) append(finals);
      setInterim(partial);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") setMsg("Micro refusé : autorise-le dans le navigateur, ou écris à la main.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setMsg("La dictée s'est interrompue : tu peux continuer à écrire.");
    };
    rec.onend = () => {
      setInterim("");
      setMode("idle");
    };
    recRef.current = rec;
    setMsg(null);
    setMode("speech");
    onVoiceUsed?.();
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
          form.set("audio", blob, `rdv.${(mr.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm"}`);
          const res = await fetch("/api/idees/transcrire", { method: "POST", body: form });
          const json = (await res.json()) as { text?: string; error?: string };
          if (res.ok && json.text) append(json.text);
          else setMsg(json.error ?? "La transcription a échoué : écris à la main.");
        } catch {
          setMsg("Pas de réseau pour transcrire : écris à la main.");
        }
        setMode("idle");
      };
      mediaRef.current = mr;
      setMsg(null);
      setMode("record");
      onVoiceUsed?.();
      mr.start();
      setTimeout(() => mr.state !== "inactive" && mr.stop(), 60000);
    } catch {
      setMsg("Micro indisponible ou refusé : écris à la main.");
    }
  };

  const toggle = () => {
    if (mode === "speech") return recRef.current?.stop();
    if (mode === "record") return mediaRef.current?.state !== "inactive" ? mediaRef.current?.stop() : undefined;
    if (mode === "transcribing") return;
    const Ctor = speechCtor();
    const canRecord = typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    if (Ctor) startSpeech(Ctor);
    else if (canRecord) void startRecording();
    else setMsg("Dictée indisponible sur cet appareil : écris à la main.");
  };

  const listening = mode === "speech" || mode === "record";
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <textarea
          value={interim ? join(value, interim) : value}
          readOnly={!!interim}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`w-full rounded-md border border-line bg-card-alt px-2 py-1.5 pr-11 text-xs text-ink outline-none focus:border-gold ${className}`}
        />
        <button
          type="button"
          onClick={toggle}
          disabled={mode === "transcribing"}
          aria-label={listening ? "Arrêter la dictée" : "Dicter à la voix"}
          className={`absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full ${listening ? "animate-pulse bg-red text-white" : "bg-gold text-night"} disabled:opacity-50`}
        >
          {listening ? <Square size={14} /> : <Mic size={15} />}
        </button>
      </div>
      <div className="min-h-[14px] text-[10px] text-muted">
        {mode === "speech" && "Je t'écoute… parle, puis appuie sur le carré pour arrêter."}
        {mode === "record" && "Enregistrement… appuie sur le carré pour arrêter et transcrire."}
        {mode === "transcribing" && "Transcription en cours…"}
        {mode === "idle" && msg}
      </div>
    </div>
  );
}
