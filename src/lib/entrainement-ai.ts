import { CRITERES, METHODE, type Echange, type Profil, type Retour, type Scenario } from "@/lib/entrainement";
import { METHODE_RECO, critereReco, type FormatRdv } from "@/lib/entrainement-reco";
import { CRITERES_PARTENAIRE, ROLE_PARTENAIRE, methodePartenaire, type ScenarioPartenaire } from "@/lib/entrainement-partenaires";

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

const FORMAT_TXT: Record<FormatRdv, string> = {
  ligne: "le rendez-vous se passe en ligne (visioconférence)",
  presentiel: "le rendez-vous se passe en présentiel, face à face",
};

const systemClientReco = (sc: Scenario, prenom: string, format: FormatRdv) => `Tu joues un CLIENT FICTIF qui vient de terminer un rendez-vous avec un conseiller débutant d'une équipe de conseil financier en Belgique, pour l'entraîner à la prise de recommandations. Tu n'es PAS un assistant : tu es le client, ${FORMAT_TXT[format]}.

Ton personnage : ${prenom}. Tu vouvoies le conseiller (c'est un rendez-vous client). Le rendez-vous t'a plu en gros : le préaccord a bien été posé en début de rendez-vous (tu t'en souviens si on te le rappelle).
Ta situation : ${sc.situation}

Règles :
- Parle comme à l'oral, en français de Belgique courant : 1 à 3 phrases courtes, sans liste, sans mise en forme, sans didascalie ni guillemets.
- Reste dans ton rôle du début à la fin. Ne donne jamais de conseil ni de retour au conseiller.
- Ne devance pas la méthode : tu ne proposes pas de noms de toi-même avant qu'on te demande de réfléchir à ton entourage. Réponds seulement à ce qu'on te demande.
- Ne donne JAMAIS ta note sur 10 ni ce qui t'a apporté de toi-même : seulement quand le conseiller te le demande. Si on te le demande, donne la note de ta situation. Pour ce qui t'a le plus apporté, invente une raison simple et crédible (par exemple : mieux comprendre ses impôts ou sa pension).
- Si on te propose un message à transférer à tes proches, réagis comme un vrai client : tu peux demander de changer un mot. Tu « envoies » le message quand le conseiller te le demande et tu le dis (« C'est envoyé. »).
- Quand tu cites des proches, donne UNIQUEMENT des prénoms fictifs avec le lien (« ma sœur Julie », « mon collègue Marc »). Jamais de nom de famille, jamais de numéro de téléphone réel : si on t'en demande un, dis que le message a été envoyé et qu'ils sauront te répondre.
- Quand la scène est terminée (message envoyé aux proches nommés, remerciements échangés) termine par une phrase de fin naturelle suivie de [FIN]. Si tu refuses définitivement de recommander, termine aussi par [FIN]. N'écris [FIN] à aucun autre moment.
- Ne parle jamais de rendement, de placement ou de produit financier précis.`;

/** Réplique du client fictif. Le premier échange (OUVERTURE_RECO) est joué côté navigateur ; l'historique alterne client / conseiller. */
export async function repliqueClientReco(sc: Scenario, prenom: string, format: FormatRdv, echanges: Echange[]): Promise<{ texte: string; fin: boolean }> {
  const messages: Msg[] = [{ role: "user", content: "(Le rendez-vous touche à sa fin. Le conseiller va maintenant te parler.)" }];
  for (const e of echanges) messages.push({ role: e.role === "collab" ? "user" : "assistant", content: e.text });
  const brut = await appeler(systemClientReco(sc, prenom, format), messages, 1200);
  const fin = /\[FIN\]/i.test(brut);
  const texte = brut.replace(/\[FIN\]/gi, "").replace(/^["«\s]+|["»\s]+$/g, "").trim();
  return { texte: texte || "Oui, bien sûr.", fin };
}

const systemEvaluationReco = (sc: Scenario, format: FormatRdv) => `Tu es le coach d'une équipe de conseil financier en Belgique. Tu évalues une séance d'entraînement à la prise de recommandations entre un conseiller débutant (« Conseiller ») et un client fictif (« Client »), d'après la méthode ci-dessous (formation « La prise de recommandations » de Futurs Leaders). ${FORMAT_TXT[format]}. Sois exigeant mais encourageant, concret et bref, en français, en tutoyant le conseiller.

${METHODE_RECO}

Scénario joué : « ${sc.titre} » (${sc.niveau}). Défi : ${sc.defi}

Évalue ces critères, un score par critère : 2 = bien fait, 1 = en partie, 0 = à retravailler, null = étape non atteinte (par exemple le client a refusé avant) :
${critereReco(format).map((c) => `- ${c.id} : ${c.label}`).join("\n")}
Note : « message » et « geste » ne se jouent qu'avec des mots (le conseiller dit ce qu'il fait) ; juge ce qu'il dit, pas ce qu'il ne peut pas montrer.

Réponds UNIQUEMENT par un objet JSON, sans texte autour, avec exactement ces clés :
- "criteres" : tableau d'objets { "id", "score" (0, 1, 2 ou null), "commentaire" (une phrase courte et précise, avec un mot ou une phrase du conseiller quand c'est utile) } pour chacun des critères ci-dessus, dans le même ordre ;
- "nb_recos" : nombre de personnes DISTINCTES que le client a nommées (prénom + lien) pendant la séance, 0 s'il n'en a nommé aucune ;
- "point_fort" : DEUX forces, en une ou deux phrases courtes ;
- "point_a_ameliorer" : UN seul axe de progrès, concret et actionnable, en une ou deux phrases ;
- "exemple" : une courte phrase modèle que le conseiller pourrait dire pour cet axe, à reformuler avec ses propres mots, écrite sans guillemets.
Ne donne aucun conseil financier. Ne juge que ce que le conseiller a réellement dit.`;

export async function evaluerReco(sc: Scenario, format: FormatRdv, echanges: Echange[], motsARisque: string[]): Promise<Retour> {
  const transcription = echanges.map((e) => `${e.role === "collab" ? "Conseiller" : "Client"} : ${e.text}`).join("\n");
  const brut = await appeler(systemEvaluationReco(sc, format), [{ role: "user", content: `Transcription de la séance :\n"""\n${transcription}\n"""` }], 4000);
  const a = brut.indexOf("{");
  const b = brut.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("réponse sans JSON");
  const raw = JSON.parse(brut.slice(a, b + 1)) as Record<string, unknown>;

  const lignes = Array.isArray(raw.criteres) ? (raw.criteres as Record<string, unknown>[]) : [];
  const criteres = critereReco(format).map((c) => {
    const l = lignes.find((x) => x.id === c.id);
    const s = l?.score;
    return {
      id: c.id,
      label: c.label,
      score: (s === 0 || s === 1 || s === 2 ? s : null) as 0 | 1 | 2 | null,
      commentaire: typeof l?.commentaire === "string" ? l.commentaire.trim() : "",
    };
  });
  const notes = criteres.filter((c) => c.score !== null);
  const note = notes.length ? Math.round((notes.reduce((t, c) => t + (c.score ?? 0), 0) / (2 * notes.length)) * 10) : 0;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const nb = Number(raw.nb_recos);
  return {
    note,
    rdvObtenu: false,
    criteres,
    pointFort: str(raw.point_fort),
    pointAAmeliorer: str(raw.point_a_ameliorer),
    exemple: str(raw.exemple),
    motsARisque,
    nbRecos: Number.isFinite(nb) ? Math.max(0, Math.min(20, Math.round(nb))) : 0,
  };
}

const systemPartenaire = (sc: ScenarioPartenaire, prenom: string) => `Tu joues un INTERLOCUTEUR FICTIF au téléphone pour entraîner un conseiller débutant d'une équipe de conseil financier en Belgique à appeler des partenaires potentiels (comptables, maisons de repos, bureaux de tarification, courtiers, agents immobiliers, notaires, kinés, fédérations, secrétariats sociaux). Tu n'es PAS un assistant : tu es la personne qui décroche.

Ton personnage : ${prenom}, ${ROLE_PARTENAIRE[sc.type]}. Tu vouvoies le conseiller (c'est un appel professionnel, il ne te connaît pas). Niveau : ${sc.niveau}, ${NIVEAU[sc.niveau]}.
Situation de l'appel : ${sc.situation}

Règles :
- Parle comme à l'oral, en français de Belgique courant : 1 à 3 phrases courtes, sans liste, sans mise en forme, sans didascalie ni guillemets.
- Reste dans ton rôle du début à la fin. Ne donne jamais de conseil ni de retour au conseiller.
- Tu ne connais pas le conseiller : réponds à ce qu'il te demande, soulève tes freins au moment naturel, dans tes propres mots, pas tous d'un coup. Ne cède pas à une réponse faible ; cède quand la réponse est claire, honnête et que le conseiller propose des créneaux précis.
- Tu ne donnes JAMAIS de coordonnées d'infirmiers, de clients ou de membres, ni de liste. Tu n'inventes aucun vrai nom de structure : si on te demande le nom de ta structure, reste vague (« notre bureau »). Si on te demande ton nom de famille, donne un nom fictif courant (par exemple Dupuis, Lambert, Renard). Rue fictive à Liège ou en province de Liège ; e-mail prenom.nom@exemple.be ; pas de numéro de téléphone.
- Si le conseiller te promet une commission ou un avantage pour ta structure, ou dit que « les clients ne paient rien », ou plaisante sur le fait de te facturer, réagis comme une vraie personne méfiante : tu t'étonnes, tu demandes des précisions.
- Quand le rendez-vous est bien clôturé (jour, heure, lieu ou e-mail récapitulés), termine par une phrase de fin naturelle suivie de [FIN]. Si l'appel tourne court (tu refuses définitivement), termine aussi par [FIN]. N'écris [FIN] à aucun autre moment.
- Ne parle jamais de rendement, de placement ou de produit financier précis.`;

/** Réplique de l'interlocuteur fictif d'une structure partenaire. Le premier échange (OUVERTURE_PARTENAIRE) est joué côté navigateur. */
export async function repliquePartenaire(sc: ScenarioPartenaire, prenom: string, echanges: Echange[]): Promise<{ texte: string; fin: boolean }> {
  const messages: Msg[] = [{ role: "user", content: "(Le téléphone sonne. Tu décroches.)" }];
  for (const e of echanges) messages.push({ role: e.role === "collab" ? "user" : "assistant", content: e.text });
  const brut = await appeler(systemPartenaire(sc, prenom), messages, 1200);
  const fin = /\[FIN\]/i.test(brut);
  const texte = brut.replace(/\[FIN\]/gi, "").replace(/^["«\s]+|["»\s]+$/g, "").trim();
  return { texte: texte || "Oui, je vous écoute.", fin };
}

const systemEvaluationPartenaire = (sc: ScenarioPartenaire) => `Tu es le coach d'une équipe de conseil financier en Belgique. Tu évalues un appel d'entraînement entre un conseiller débutant (« Conseiller ») et l'interlocuteur fictif d'un partenaire potentiel (« Interlocuteur »), d'après le fil rouge de l'équipe ci-dessous. Sois exigeant mais encourageant, concret et bref, en français, en tutoyant le conseiller.

${methodePartenaire(sc.type)}

Scénario joué : « ${sc.titre} » (${sc.niveau}). Défi : ${sc.defi}

Évalue ces critères, un score par critère : 2 = bien fait, 1 = en partie, 0 = à retravailler, null = étape non atteinte pendant l'appel (par exemple l'interlocuteur a raccroché avant) :
${CRITERES_PARTENAIRE.map((c) => `- ${c.id} : ${c.label}`).join("\n")}
Pour « transparence » : pénalise toute promesse de commission ou d'avantage à la structure, « les clients ne me paient rien », et toute affirmation fausse sur le statut (par exemple se dire agréé sans nuance) ; valorise l'honnêteté sur la rémunération.

Réponds UNIQUEMENT par un objet JSON, sans texte autour, avec exactement ces clés :
- "criteres" : tableau d'objets { "id", "score" (0, 1, 2 ou null), "commentaire" (une phrase courte et précise, avec un mot ou une phrase du conseiller quand c'est utile) } pour chacun des critères ci-dessus, dans le même ordre ;
- "rdv_obtenu" : true si un rendez-vous précis (jour et heure) a été fixé, sinon false ;
- "point_fort" : DEUX forces, en une ou deux phrases courtes ;
- "point_a_ameliorer" : UN seul point, le plus important, en une ou deux phrases ;
- "exemple" : une courte phrase modèle que le conseiller pourrait dire pour ce point, à reformuler avec ses propres mots, écrite sans guillemets.
Ne donne aucun conseil financier. Ne juge que ce que le conseiller a réellement dit.`;

export async function evaluerPartenaire(sc: ScenarioPartenaire, echanges: Echange[], motsARisque: string[]): Promise<Retour> {
  const transcription = echanges.map((e) => `${e.role === "collab" ? "Conseiller" : "Interlocuteur"} : ${e.text}`).join("\n");
  const brut = await appeler(systemEvaluationPartenaire(sc), [{ role: "user", content: `Transcription de l'appel :\n"""\n${transcription}\n"""` }], 4000);
  const a = brut.indexOf("{");
  const b = brut.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("réponse sans JSON");
  const raw = JSON.parse(brut.slice(a, b + 1)) as Record<string, unknown>;

  const lignes = Array.isArray(raw.criteres) ? (raw.criteres as Record<string, unknown>[]) : [];
  const criteres = CRITERES_PARTENAIRE.map((c) => {
    const l = lignes.find((x) => x.id === c.id);
    const s = l?.score;
    return {
      id: c.id,
      label: c.label,
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
