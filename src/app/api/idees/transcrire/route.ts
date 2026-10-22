import { NextResponse } from "next/server";
import { getCurrentPerson } from "@/lib/current-person";

// Bloc 8 — repli de la dictée (iPhone et navigateurs sans reconnaissance vocale) : le navigateur enregistre un
// court audio, ce point d'entrée le transmet à un service de reconnaissance vocale hébergé en Europe (Mistral,
// modèle Voxtral) puis oublie l'audio : il n'est ni stocké, ni journalisé. Clé : MISTRAL_API_KEY (serveur uniquement).

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const me = await getCurrentPerson();
  if (!me) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return NextResponse.json({ error: "Transcription indisponible : écris ton idée, elle sera traitée pareil." }, { status: 503 });

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("audio");
    audio = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "Audio illisible." }, { status: 400 });
  }
  if (!audio || audio.size === 0) return NextResponse.json({ error: "Aucun audio reçu." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "Audio trop long : découpe ton idée en deux." }, { status: 413 });

  const body = new FormData();
  body.set("file", audio, audio.name || "idee.webm");
  body.set("model", process.env.MISTRAL_TRANSCRIPTION_MODEL ?? "voxtral-mini-latest");
  body.set("language", "fr");
  const res = await fetch("https://api.mistral.ai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body,
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);
  if (!res || !res.ok) return NextResponse.json({ error: "La transcription a échoué : écris ton idée." }, { status: 502 });
  const json = (await res.json()) as { text?: string };
  return NextResponse.json({ text: (json.text ?? "").trim() });
}
