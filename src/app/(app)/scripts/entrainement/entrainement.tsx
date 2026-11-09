"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, PhoneOff, RotateCcw, Send, Volume2 } from "lucide-react";
import { VoiceTextarea } from "@/components/voice-textarea";
import { MAX_CARACTERES, MAX_ECHANGES, PRENOMS, PROFILS, SCENARIOS, type Echange, type Niveau, type Retour, type Scenario } from "@/lib/entrainement";
import { evaluerSeance, repondreProspect } from "./actions";

const NIVEAU_COLOR: Record<Niveau, string> = { facile: "#1f8158", normal: "#c99a3f", difficile: "#b3543a" };
const NIVEAU_LABEL: Record<Niveau, string> = { facile: "Facile", normal: "Normal", difficile: "Difficile" };
const SCORE_COLOR = { 0: "#b3543a", 1: "#c99a3f", 2: "#1f8158" } as const;
const SCORE_LABEL = { 0: "À retravailler", 1: "En partie", 2: "Bien" } as const;

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

type Phase = "choix" | "appel" | "retour";

export function Entrainement() {
  const [phase, setPhase] = useState<Phase>("choix");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [profilId, setProfilId] = useState<string>("hasard");
  const [session, setSession] = useState<{ profilId: string; prenom: string } | null>(null);
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const [saisie, setSaisie] = useState("");
  const [fin, setFin] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [voix, setVoix] = useState(false);
  const [pending, start] = useTransition();
  const fond = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fond.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [echanges, pending]);

  const parler = (texte: string) => {
    if (!voix || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = "fr-BE";
    window.speechSynthesis.speak(u);
  };

  const demarrer = (sc: Scenario) => {
    const p = profilId === "hasard" ? pick(PROFILS).id : profilId;
    setScenario(sc);
    setSession({ profilId: p, prenom: pick(PRENOMS) });
    setEchanges([{ role: "prospect", text: "Allô ?" }]);
    setSaisie("");
    setFin(false);
    setRetour(null);
    setErreur(null);
    setPhase("appel");
    if (voix) setTimeout(() => parler("Allô ?"), 100);
  };

  const envoyer = () => {
    const texte = saisie.trim();
    if (!texte || !scenario || !session || pending || fin) return;
    if (texte.length > MAX_CARACTERES) return setErreur(`${MAX_CARACTERES} caractères au maximum par réplique.`);
    if (echanges.length >= MAX_ECHANGES * 2) return setErreur("L'appel est déjà long : termine-le pour voir ton retour.");
    const suite: Echange[] = [...echanges, { role: "collab", text: texte }];
    setEchanges(suite);
    setSaisie("");
    setErreur(null);
    start(async () => {
      const res = await repondreProspect(scenario.id, session.profilId, session.prenom, suite);
      if (!res.ok) return setErreur(res.error);
      setEchanges([...suite, { role: "prospect", text: res.texte }]);
      parler(res.texte);
      if (res.fin) setFin(true);
    });
  };

  const terminer = () => {
    if (!scenario || pending) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setErreur(null);
    start(async () => {
      const res = await evaluerSeance(scenario.id, echanges);
      if (!res.ok) return setErreur(res.error);
      setRetour(res.retour);
      setPhase("retour");
    });
  };

  const recommencer = (memeScenario: boolean) => {
    if (memeScenario && scenario) return demarrer(scenario);
    setPhase("choix");
    setScenario(null);
    setRetour(null);
    setEchanges([]);
  };

  const profil = PROFILS.find((p) => p.id === session?.profilId);
  const nbCollab = echanges.filter((e) => e.role === "collab").length;

  // ---------------------------------------------------------------- choix
  if (phase === "choix") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-muted">
            Qui tu appelles
            <select value={profilId} onChange={(e) => setProfilId(e.target.value)} className="rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold">
              <option value="hasard">Au hasard</option>
              {PROFILS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-muted">
            <input type="checkbox" checked={voix} onChange={(e) => setVoix(e.target.checked)} /> Entendre le prospect à voix haute
          </label>
        </div>

        {(["facile", "normal", "difficile"] as Niveau[]).map((n) => (
          <div key={n}>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: NIVEAU_COLOR[n] }}>
              {NIVEAU_LABEL[n]}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCENARIOS.filter((s) => s.niveau === n).map((s) => (
                <button key={s.id} onClick={() => demarrer(s)} className="rounded-2xl border border-line bg-card p-3.5 text-left hover:border-gold">
                  <div className="text-sm font-bold text-ink">{s.titre}</div>
                  <div className="mt-0.5 text-xs text-muted">{s.defi}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted">
          Le prospect est fictif : aucun vrai nom, aucune donnée de client. Ta séance n&apos;est pas enregistrée : elle disparaît quand tu quittes la page.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------- retour
  if (phase === "retour" && retour && scenario) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-line bg-card p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{scenario.titre}</div>
          <div className="mt-1 font-serif text-4xl font-semibold text-gold-light">{retour.note} / 10</div>
          <div className="mt-1 text-xs text-muted">{retour.rdvObtenu ? "Rendez-vous fixé : bravo." : "Pas de rendez-vous précis fixé cette fois."}</div>
        </div>

        {retour.motsARisque.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-line bg-card p-3 text-xs text-ink">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-gold-light" />
            <span>
              Tu as employé des mots à risque : <strong>{retour.motsARisque.join(", ")}</strong>. Pas de promesse de rendement, pas de « garanti » : c&apos;est une règle FSMA.
            </span>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2 text-sm font-bold text-ink">Étape par étape</div>
          <div className="flex flex-col gap-2">
            {retour.criteres.map((c) => (
              <div key={c.id} className="rounded-xl bg-card-alt p-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-ink">{c.label}</span>
                  {c.score === null ? (
                    <span className="text-muted">Non atteint</span>
                  ) : (
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ borderColor: SCORE_COLOR[c.score], color: SCORE_COLOR[c.score] }}>
                      {SCORE_LABEL[c.score]}
                    </span>
                  )}
                </div>
                {c.commentaire && <div className="mt-1 text-muted">{c.commentaire}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-3.5 text-xs">
          {retour.pointFort && (
            <div className="mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-green">Ce qui a bien marché</div>
              <div className="mt-0.5 text-ink">{retour.pointFort}</div>
            </div>
          )}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gold-light">Un point à améliorer</div>
            <div className="mt-0.5 text-ink">{retour.pointAAmeliorer || "Rejoue ce scénario pour t'améliorer."}</div>
            {retour.exemple && <div className="mt-1.5 rounded-lg bg-card-alt p-2 italic text-muted">Par exemple : « {retour.exemple} » (avec tes propres mots)</div>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => recommencer(true)} className="flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-2 text-sm font-bold text-night">
            <RotateCcw size={14} /> Rejouer ce scénario
          </button>
          <button onClick={() => recommencer(false)} className="rounded-lg border border-line px-3.5 py-2 text-sm text-ink">
            Autre scénario
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- appel
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-card p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-ink">{scenario?.titre}</span>
          {scenario && (
            <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ borderColor: NIVEAU_COLOR[scenario.niveau], color: NIVEAU_COLOR[scenario.niveau] }}>
              {NIVEAU_LABEL[scenario.niveau]}
            </span>
          )}
        </div>
        <div className="mt-1 text-muted">
          Tu appelles {session?.prenom}, {profil?.label}. {scenario?.defi}
        </div>
      </div>

      <div className="flex max-h-[55vh] min-h-[220px] flex-col gap-2 overflow-y-auto rounded-2xl border border-line bg-card p-3">
        {echanges.map((e, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${e.role === "collab" ? "self-end bg-gold text-night" : "self-start border border-line bg-card-alt text-ink"}`}>
            <div className={`mb-0.5 text-[10px] font-bold uppercase tracking-wide ${e.role === "collab" ? "text-night/70" : "text-muted"}`}>{e.role === "collab" ? "Toi" : session?.prenom}</div>
            {e.text}
          </div>
        ))}
        {pending && <div className="self-start text-xs text-muted">{session?.prenom} réfléchit…</div>}
        <div ref={fond} />
      </div>

      {fin && <div className="rounded-xl border border-line bg-card p-2.5 text-xs text-ink">L&apos;appel est terminé. Demande ton retour.</div>}

      {!fin && (
        <div className="flex flex-col gap-2">
          <VoiceTextarea value={saisie} onChange={setSaisie} rows={3} placeholder={nbCollab === 0 ? "Décroche-lui : « Allo ! C'est … à l'appareil, bonjour ! »" : "Ta réponse (au clavier ou au micro)"} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={envoyer} disabled={pending || !saisie.trim()} className="flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-2 text-sm font-bold text-night disabled:opacity-50">
              <Send size={14} /> Envoyer
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={voix} onChange={(e) => setVoix(e.target.checked)} />
              <Volume2 size={13} /> Voix du prospect
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={terminer} disabled={pending || nbCollab < 2} className="flex items-center gap-1.5 rounded-lg border border-gold px-3.5 py-2 text-sm font-bold text-gold-light disabled:opacity-50">
          <PhoneOff size={14} /> {pending ? "Un instant…" : "Terminer l'appel et voir le retour"}
        </button>
        <button onClick={() => recommencer(false)} className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted">
          Abandonner
        </button>
      </div>
      {nbCollab < 2 && <div className="text-[11px] text-muted">Échange au moins deux répliques avant de demander le retour.</div>}
      {erreur && <div className="text-xs text-red">{erreur}</div>}
    </div>
  );
}
