import { CRITERES, METHODE, type Echange, type Profil, type Retour, type Scenario } from "@/lib/entrainement";

// Jeu de rôle et retour de l'entraînement aux appels : Claude joue un prospect fictif, puis évalue l'appel d'après la méthode
// de l'équipe. La clé API reste côté serveur (ANTHROPIC_API_KEY). Rien n'est stocké : la séance n'existe que dans le navigateur.

export const ENTRAINEMENT_MODEL = process.env.ANTHROPIC_ENTRAINEMENT_MODEL ?? process.env.ANTHROPIC_IDEES_MODEL ?? "claude-haiku-5-5";

type Msg = { role: "user" | "assistant"; content: string };

async function appeler(system: string, messages: Msg[], maxTokens: number): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY absente");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: ENTRAINEMENT_MODEL, max_tokens: maxTokens, output_config: { effort: "low" }, system, messages }),
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`API Anthropic ${res.status}`);
  const body = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (body.content ?? []).map((c) => c.text ?? "").join("").trim();
}

const NIVEAU: Record<Scenario["niveau"], string> = {
  facile: "coopératif : tu es de bonne composition et tu cèdes dès qu'on te répond correctement",
  normal: "tu hésites et tu soulèves une objection ; tu cèdes si la réponse est claire et convaincante",
  difficile: "tu es exigeant : tu insistes, tu ne cèdes pas aux réponses floues et tu ne cèdes qu'aux réponses claires",
};

const systemProspect = (sc: Scenario, pr: Profil, prenom: string) => `Tu joues un PROSPECT FICTIF au téléphone pour entraîner un collaborateur débutant d'une équipe de conseil financier en Belgique. Tu n'es PAS un assistant : tu es la personne qui reçoit l'appel.

Ton personnage : ${prenom}, ${pr.label} (${pr.traits}). Tu tutoies le collaborateur, c'est une connaissance. Niveau : ${sc.niveau}, ${NIVEAU[sc.niveau]}.
Situation de l'appel : ${sc.situation}

Règles :
- Parle comme à l'oral, en français de Belgique courant : 1 à 3 phrases courtes, sans liste, sans mise en forme, sans didascalie ni guillemets.
- Reste dans ton rôle du début à la fin. Ne donne jamais de conseil ni de retour au collaborateur.
- Au début, réponds naturellement aux banalités (nouvelles, famille, boulot).
- Soulève tes freins au moment naturel, dans tes propres mots, pas tous d'un coup. Ne cède pas à une réponse faible ; cède quand la réponse est claire et propose un créneau précis.
- N'invente ni vrai nom, ni vrai numéro. Si on te demande ton adresse, donne une rue fictive à Liège ; ton e-mail est prenom.nom@exemple.be.
- Quand le rendez-vous est bien clôturé (jour, heure, lieu récapitulés), termine par une phrase de fin naturelle suivie de [FIN]. Si l'appel tourne court (tu refuses définitivement), termine aussi par [FIN]. N'écris [FIN] à aucun autre moment.
- Ne parle jamais de rendement, de placement ou de produit financier précis.`;

/** Réplique du prospect. Le premier échange (« Allô ? ») est joué côté navigateur ; l'historique alterne collaborateur / prospect. */
export async function repliqueProspect(sc: Scenario, pr: Profil, prenom: string, echanges: Echange[]): Promise<{ texte: string; fin: boolean }> {
  const messages: Msg[] = [{ role: "user", content: "(Le téléphone sonne. Tu décroches.)" }];
  for (const e of echanges) messages.push({ role: e.role === "collab" ? "user" : "assistant", content: e.text });
  const brut = await appeler(systemProspect(sc, pr, prenom), messages, 1200);
  const fin = /\[FIN\]/i.test(brut);
  const texte = brut.replace(/\[FIN\]/gi, "").replace(/^["«\s]+|["»\s]+$/g, "").trim();
  return { texte: texte || "Allô ?", fin };
}

const systemEvaluation = (sc: Scenario, reponsesValidees: string[]) => `Tu es le coach d'une équipe de conseil financier en Belgique. Tu évalues un appel d'entraînement entre un collaborateur débutant (« Collaborateur ») et un prospect fictif (« Prospect »), d'après la méthode de l'équipe ci-dessous. Sois exigeant mais encourageant, concret et bref, en français, en tutoyant le collaborateur.

${METHODE}
${reponsesValidees.length ? `\nRéponses validées par l'équipe pour les objections (autres formulations acceptées) :\n${reponsesValidees.map((r) => `- ${r}`).join("\n")}\n` : ""}
Scénario joué : « ${sc.titre} » (${sc.niveau}). Défi : ${sc.defi}

Évalue ces critères, un score par critère : 2 = bien fait, 1 = en partie, 0 = à retravailler, null = étape non atteinte pendant l'appel (par exemple le prospect a refusé avant) :
${CRITERES.map((c) => `- ${c.id} : ${c.label}`).join("\n")}

Réponds UNIQUEMENT par un objet JSON, sans texte autour, avec exactement ces clés :
- "criteres" : tableau d'objets { "id", "score" (0, 1, 2 ou null), "commentaire" (une phrase courte et précise, avec un mot ou une phrase du collaborateur quand c'est utile) } pour chacun des critères ci-dessus, dans le même ordre ;
- "rdv_obtenu" : true si un rendez-vous précis (jour et heure) a été fixé, sinon false ;
- "point_fort" : une phrase sur ce qui a bien marché ;
- "point_a_ameliorer" : UN seul point, le plus important, en une ou deux phrases ;
- "exemple" : une courte phrase modèle que le collaborateur pourrait dire pour ce point, à reformuler avec ses propres mots.
Ne donne aucun conseil financier. Ne juge que ce que le collaborateur a réellement dit.`;

const pointsParCritere = new Map(CRITERES.map((c) => [c.id, c.label]));

export async function evaluerAppel(sc: Scenario, echanges: Echange[], reponsesValidees: string[], motsARisque: string[]): Promise<Retour> {
  const transcription = echanges.map((e) => `${e.role === "collab" ? "Collaborateur" : "Prospect"} : ${e.text}`).join("\n");
  const brut = await appeler(systemEvaluation(sc, reponsesValidees), [{ role: "user", content: `Transcription de l'appel :\n"""\n${transcription}\n"""` }], 4000);
  const a = brut.indexOf("{");
  const b = brut.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("réponse sans JSON");
  const raw = JSON.parse(brut.slice(a, b + 1)) as Record<string, unknown>;

  const lignes = Array.isArray(raw.criteres) ? (raw.criteres as Record<string, unknown>[]) : [];
  const criteres = CRITERES.map((c) => {
    const l = lignes.find((x) => x.id === c.id);
    const s = l?.score;
    return {
      id: c.id,
      label: pointsParCritere.get(c.id) ?? c.label,
      score: (s === 0 || s === 1 || s === 2 ? s : null) as 0 | 1 | 2 | null,
      commentaire: typeof l?.commentaire === "string" ? l.commentaire.trim() : "",
    };
  });
  const notes = criteres.filter((c) => c.score !== null);
  const note = notes.length ? Math.round((notes.reduce((t, c) => t + (c.score ?? 0), 0) / (2 * notes.length)) * 10) : 0;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    note,
    rdvObtenu: raw.rdv_obtenu === true,
    criteres,
    pointFort: str(raw.point_fort),
    pointAAmeliorer: str(raw.point_a_ameliorer),
    exemple: str(raw.exemple),
    motsARisque,
  };
}
