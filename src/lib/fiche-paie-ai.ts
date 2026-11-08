// Lecture d'une fiche de paie (PDF ou photo) par Claude. Le fichier est transmis tel quel au service puis oublié : il n'est
// ni stocké ni journalisé par le CRM. Seuls les montants relus, après vérification par la personne, sont enregistrés.
// La clé API reste côté serveur (variable d'environnement ANTHROPIC_API_KEY).

export const FICHE_MODEL = process.env.ANTHROPIC_FICHE_MODEL ?? process.env.ANTHROPIC_IDEES_MODEL ?? "claude-haiku-5-5";

export interface FichePaie {
  employeur: string;
  /** Mois concerné par la paie, AAAA-MM (null si illisible). */
  periode: string | null;
  brut: number | null;
  /** Cotisations sociales du travailleur retenues (ONSS). */
  cotisations: number | null;
  /** Précompte professionnel retenu. */
  precompte: number | null;
  /** Net à payer. */
  net: number | null;
}

const SYSTEM = `Tu lis une fiche de paie belge (document en français, néerlandais ou anglais) pour pré-remplir un formulaire.
Réponds UNIQUEMENT par un objet JSON, sans texte autour, avec exactement ces clés :
- "employeur" : nom de l'employeur (texte, "" si illisible) ;
- "periode" : mois de la paie au format AAAA-MM (null si illisible) ;
- "brut" : rémunération brute totale du mois, en euros (nombre, null si absent) ;
- "cotisations" : cotisations sociales personnelles retenues sur le brut (ONSS / RSZ), en euros (nombre positif, null si absent) ;
- "precompte" : précompte professionnel retenu, en euros (nombre positif, null si absent) ;
- "net" : net à payer au travailleur, en euros (nombre, null si absent).
Recopie les montants tels qu'ils sont écrits ; n'invente rien et ne calcule rien. Si le document n'est pas une fiche de paie, mets tout à null et "employeur" à "".`;

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1_000_000) return Math.round(v * 100) / 100;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(n) && n >= 0 && n < 1_000_000) return Math.round(n * 100) / 100;
  }
  return null;
};

export function normalizeFiche(raw: Record<string, unknown>): FichePaie {
  const periodeRaw = typeof raw.periode === "string" ? raw.periode.trim() : "";
  return {
    employeur: typeof raw.employeur === "string" ? raw.employeur.trim().slice(0, 80) : "",
    periode: /^\d{4}-(0[1-9]|1[0-2])$/.test(periodeRaw) ? periodeRaw : null,
    brut: num(raw.brut),
    cotisations: num(raw.cotisations),
    precompte: num(raw.precompte),
    net: num(raw.net),
  };
}

export async function lireFichePaie(base64: string, mediaType: string): Promise<FichePaie> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY absente : lecture automatique indisponible");
  const block =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: FICHE_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: [block, { type: "text", text: "Lis cette fiche de paie." }] }],
    }),
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 160).replace(/\s+/g, " ");
    throw new Error(`API Anthropic ${res.status} ${detail}`.trim());
  }
  const body = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (body.content ?? []).map((c) => c.text ?? "").join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("réponse sans JSON");
  return normalizeFiche(JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>);
}
