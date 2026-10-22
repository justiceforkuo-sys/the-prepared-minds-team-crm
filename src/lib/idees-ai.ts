import { FLECHES, type Fleche } from "@/lib/idees";

// Bloc 8 — traitement automatique d'une idée par Claude (modèle rapide). La clé API reste côté serveur
// (variable d'environnement ANTHROPIC_API_KEY) : jamais envoyée au navigateur. L'idée brute n'est jamais modifiée.

export const IDEES_MODEL = process.env.ANTHROPIC_IDEES_MODEL ?? "claude-haiku-5-5";

export interface IdeeAnalysis {
  reformulation: string;
  tiroir: string | null;
  fleche: Fleche | null;
  questions: string[];
  faisabilite: string;
  prochaine_action: string;
  action_date: string | null;
}

const SYSTEM = (tiroirs: string[], today: string) => `Tu aides un conseiller financier indépendant belge (équipe Prepared Minds Team, OVB Willemot) à ranger ses idées.
Règle de base : ne jamais faire confiance à sa mémoire, capturer tout de suite, même un seul mot. Tu reçois une idée brute, parfois dictée à la voix (fautes, répétitions, phrases coupées).

Réponds UNIQUEMENT par un objet JSON, sans texte autour, avec exactement ces clés :
- "reformulation" : l'idée reformulée proprement, en 1 à 3 phrases, sans rien inventer ;
- "tiroir" : EXACTEMENT un des tiroirs suivants, ou null si aucun ne convient :
${tiroirs.map((t) => `  - ${t}`).join("\n")}
- "fleche" : "Ma team" (ce qui concerne l'équipe, le recrutement, l'animation) ou "Vision d'ensemble" (ce qui concerne la direction à long terme) ;
- "questions" : 1 à 3 questions courtes pour creuser l'idée ;
- "faisabilite" : courte évaluation (1 à 2 phrases) : ce qui rend l'idée facile ou difficile ;
- "prochaine_action" : UNE action concrète et petite, à l'impératif ;
- "action_date" : date proposée au format AAAA-MM-JJ, à partir d'aujourd'hui (${today}), réaliste (en général dans les 7 jours).

Ne donne aucun conseil financier ou réglementaire. Écris en français.`;

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("réponse sans JSON");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Valide et normalise la réponse du modèle (tiroir dans la liste, date valide et non passée, etc.). */
export function normalizeAnalysis(raw: Record<string, unknown>, tiroirs: string[], today: string): IdeeAnalysis {
  const tiroirRaw = str(raw.tiroir);
  const tiroir = tiroirs.find((t) => t.toLowerCase() === tiroirRaw.toLowerCase()) ?? null;
  const flecheRaw = str(raw.fleche);
  const fleche = FLECHES.find((f) => f.toLowerCase() === flecheRaw.toLowerCase().replace("’", "'")) ?? null;
  const questions = Array.isArray(raw.questions) ? raw.questions.map(str).filter(Boolean).slice(0, 3) : [];
  const dateRaw = str(raw.action_date);
  const action_date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) && dateRaw >= today && dateRaw <= "2100-12-31" && !Number.isNaN(Date.parse(dateRaw)) ? dateRaw : null;
  return {
    reformulation: str(raw.reformulation),
    tiroir,
    fleche,
    questions,
    faisabilite: str(raw.faisabilite),
    prochaine_action: str(raw.prochaine_action),
    action_date,
  };
}

export async function analyserIdee(texte: string, tiroirs: string[], today: string): Promise<IdeeAnalysis> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY absente : traitement automatique indisponible");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: IDEES_MODEL,
      max_tokens: 700,
      system: SYSTEM(tiroirs, today),
      messages: [{ role: "user", content: `Idée brute :\n"""\n${texte.slice(0, 4000)}\n"""` }],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`API Anthropic ${res.status}`);
  const body = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (body.content ?? []).map((c) => c.text ?? "").join("");
  return normalizeAnalysis(extractJson(text), tiroirs, today);
}
