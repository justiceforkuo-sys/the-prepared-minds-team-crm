import type { Faits, Ligne, Niveau, Redaction } from "@/lib/rapport-hebdo-format";

// Rédaction de l'ouverture et de la clôture d'un rapport du vendredi. Les chiffres, les tâches et le niveau viennent des règles
// (rapport-hebdo.ts) : Claude ne choisit jamais le niveau et n'invente aucun chiffre. Clé API côté serveur uniquement.

const MODEL = process.env.ANTHROPIC_RAPPORT_MODEL ?? process.env.ANTHROPIC_IDEES_MODEL ?? "claude-haiku-5-5";

const TON: Record<Niveau, string> = {
  1: "Tu félicites sincèrement, en nommant ce qui a été tenu, puis tu relèves l'exigence : le cap suivant est plus haut. Chaleureux et exigeant.",
  2: "Tu corriges comme un bon professeur : tu constates précisément ce qui a été fait et ce qui manque, tu attends mieux et tu le dis clairement. Ferme mais encourageant.",
  3: "Tu parles comme un professeur qui reprend un élève : direct, sans détour, tu rappelles que ces tâches avaient été données la semaine dernière et que presque rien n'a été fait. Tu exiges un changement immédiat et une réponse de sa part. Ton intense, jamais méprisant.",
  4: "C'est le dernier rappel : plusieurs semaines de suite sans résultat. Tu es au maximum de la fermeté, tu constates que le message a déjà été donné plusieurs fois, et tu exiges un rendez-vous direct avec son coach cette semaine. Ton très intense, toujours respectueux.",
};

const PREMIER = "C'est son premier rapport : aucun reproche. Tu poses son point de départ, tu expliques que chaque vendredi il recevra un rapport avec le bilan de ses tâches, et que la semaine prochaine elles seront vérifiées une par une. Ton clair et exigeant.";

function repli(niveau: Niveau, baseline: boolean, taux: number | null): Redaction {
  const pct = taux === null ? "" : `${Math.round(taux * 100)} %`;
  if (baseline) return { ouverture: "Voici ton premier rapport du vendredi : ton point de départ et tes tâches pour la semaine. Chaque vendredi, je vérifierai ce qui a été fait.", cloture: "Les tâches ci-dessus seront vérifiées vendredi prochain. Je compte sur toi." };
  if (niveau === 1) return { ouverture: `Bravo : ${pct} de tes tâches sont faites. C'est du bon travail, mais le cap suivant est plus haut.`, cloture: "Continue sur ce rythme et monte d'un cran cette semaine." };
  if (niveau === 2) return { ouverture: `Seulement ${pct} de tes tâches sont faites. Ce n'est pas suffisant : regarde le bilan ci-dessous.`, cloture: "Je m'attends à mieux dès cette semaine. Réponds-moi pour me dire ce qui t'a bloqué." };
  if (niveau === 3) return { ouverture: "Les tâches que je t'avais données la semaine dernière n'ont presque pas été faites. Ce n'est pas acceptable à ce stade.", cloture: "Je veux une réponse de ta part dès aujourd'hui, et un changement immédiat dans ton travail." };
  return { ouverture: "Cela fait plusieurs semaines que les tâches demandées ne sont pas faites. Je te l'ai déjà dit, et rien n'a changé.", cloture: "Il nous faut un rendez-vous direct avec ton coach cette semaine. Réponds-moi aujourd'hui avec tes disponibilités." };
}

export async function rediger(args: { prenom: string; niveau: Niveau; baseline: boolean; serie: number; taux: number | null; bilan: Ligne[]; faits: Faits; nbTaches: number }): Promise<Redaction> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return repli(args.niveau, args.baseline, args.taux);
  const resume = args.bilan.map((b) => `- ${b.ok ? "FAIT" : "PAS FAIT"} : ${b.label} (${b.detail ?? `${b.realise}/${b.cible}`})`).join("\n");
  const system = `Tu écris l'ouverture et la clôture d'un rapport hebdomadaire envoyé par Justice, responsable d'une équipe de conseil financier en Belgique, à un collaborateur de son équipe. Le corps du rapport (bilan, situation, tâches) est ajouté automatiquement : tu n'écris QUE l'ouverture et la clôture.

Ton à tenir : ${args.baseline ? PREMIER : TON[args.niveau]}

Règles :
- Tutoiement, français de Belgique courant, première personne (« je »), de la part de Justice.
- Ouverture : 2 à 4 phrases. Clôture : 1 à 3 phrases, qui demandent une action ou une réponse précise.
- Appuie-toi UNIQUEMENT sur les faits fournis. N'invente aucun chiffre, aucune tâche, aucune date. Ne répète pas toute la liste : le bilan détaillé suit.
- Exigeant mais respectueux : aucune insulte, aucune humiliation, aucun jugement sur la personne ou sa vie privée, aucune menace sur son statut, sa rémunération ou son avenir dans l'équipe. Tu critiques des actes (« ces tâches ne sont pas faites »), jamais la personne.
- Pas d'emoji, pas de mise en forme, pas de guillemets autour du texte.
- Réponds uniquement avec un objet JSON : {"ouverture": "...", "cloture": "..."}.`;
  const user = `Collaborateur : ${args.prenom}.
${args.baseline ? "Premier rapport (pas de bilan)." : `Bilan des tâches de la semaine passée (${args.taux === null ? "?" : Math.round(args.taux * 100)} % faites, ${args.serie} semaine(s) de suite sous 50 %) :\n${resume}`}
Nombre de tâches pour la semaine qui vient : ${args.nbTaches}.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, output_config: { effort: "low" }, system, messages: [{ role: "user", content: user }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    const brut = (body.content ?? []).map((c) => c.text ?? "").join("").trim();
    const json = JSON.parse(brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1)) as Partial<Redaction>;
    if (typeof json.ouverture !== "string" || typeof json.cloture !== "string" || !json.ouverture.trim() || !json.cloture.trim()) throw new Error("format");
    return { ouverture: json.ouverture.trim().slice(0, 900), cloture: json.cloture.trim().slice(0, 600) };
  } catch {
    return repli(args.niveau, args.baseline, args.taux);
  }
}
