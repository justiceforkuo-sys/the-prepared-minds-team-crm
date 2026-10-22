"use client";

import { useMemo, useState, useTransition } from "react";
import { Lightbulb, Mic } from "lucide-react";
import { FLECHES, STATUT_LABEL, isPending, type Fleche, type Idee } from "@/lib/idees";
import { FOLLOW_UP_MAX } from "@/lib/follow-ups";
import { convertirIdee, partagerIdee, retraiterIdee, supprimerIdee, updateIdee, type IdeePatch, type IdeeResult } from "./actions";

type Vue = "a_traiter" | "tiroirs" | "en_action" | "classees" | "partagees";
type SharedIdee = Idee & { auteur: string };

const inputCls = "w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";
const ghostBtn = "rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50";
const goldBtn = "rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
}

function IdeeCard({
  idee: initial,
  tiroirs,
  hasParrain,
  isJustice,
  onGone,
}: {
  idee: Idee;
  tiroirs: string[];
  hasParrain: boolean;
  isJustice: boolean;
  onGone: (id: string) => void;
}) {
  const [idee, setIdee] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ask, setAsk] = useState<"prospect" | "candidature" | null>(null);
  const [who, setWho] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const run = (fn: () => Promise<IdeeResult>, after?: (r: IdeeResult) => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) setMsg(res.error);
      else {
        setMsg(res.message ?? null);
        after?.(res);
      }
    });

  const patch = (p: IdeePatch) => {
    setIdee((i) => ({ ...i, ...(p as Partial<Idee>) }));
    run(() => updateIdee(idee.id, p));
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-3.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] text-muted">
          {dateLabel(idee.cree_le)} · {idee.source === "voix" ? "voix" : "texte"} · <span className="font-bold text-ink">{STATUT_LABEL[idee.statut]}</span>
          {idee.convertie_en ? ` · devenue ${idee.convertie_en === "tache" ? "une tâche" : idee.convertie_en === "prospect" ? "un prospect" : "une candidature"}` : ""}
        </div>
        <button onClick={() => run(() => supprimerIdee(idee.id), () => onGone(idee.id))} className="text-[11px] text-muted underline">
          Supprimer
        </button>
      </div>

      {idee.traitement_ia === "fait" && idee.reformulation ? (
        <textarea
          defaultValue={idee.reformulation}
          rows={2}
          onBlur={(e) => e.target.value !== idee.reformulation && patch({ reformulation: e.target.value })}
          className="mt-1.5 w-full rounded-md border border-transparent bg-transparent px-0 py-0.5 text-sm font-bold text-ink outline-none focus:border-line"
        />
      ) : (
        <div className="mt-1.5 text-sm font-bold text-ink">{idee.texte_brut}</div>
      )}
      <button onClick={() => setShowRaw((s) => !s)} className="mt-0.5 text-[11px] text-gold-light underline">
        {showRaw ? "Masquer l'idée brute" : "Idée brute"}
      </button>
      {showRaw && <div className="mt-1 rounded-md bg-card-alt p-2 text-muted">{idee.texte_brut}</div>}

      {idee.traitement_ia !== "fait" && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-line p-2 text-muted">
          <span>{idee.traitement_ia === "erreur" ? "Le rangement automatique n'a pas abouti." : "Rangement automatique en attente."}</span>
          <button disabled={pending} onClick={() => run(() => retraiterIdee(idee.id), () => window.location.reload())} className={ghostBtn}>
            Ranger maintenant
          </button>
        </div>
      )}

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-muted">
          Tiroir
          <select value={idee.tiroir ?? ""} onChange={(e) => patch({ tiroir: e.target.value || null })} className={`${inputCls} mt-0.5`}>
            <option value="">— à choisir —</option>
            {idee.tiroir && !tiroirs.includes(idee.tiroir) && <option value={idee.tiroir}>{idee.tiroir}</option>}
            {tiroirs.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted">
          Flèche
          <select value={idee.fleche ?? ""} onChange={(e) => patch({ fleche: (e.target.value || null) as Fleche | null })} className={`${inputCls} mt-0.5`}>
            <option value="">—</option>
            {FLECHES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>

      {idee.questions && idee.questions.length > 0 && (
        <div className="mt-2">
          <div className="font-bold text-ink">Pour creuser</div>
          <ul className="ml-4 list-disc text-muted">
            {idee.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      {idee.faisabilite && (
        <div className="mt-2 text-muted">
          <span className="font-bold text-ink">Faisabilité :</span> {idee.faisabilite}
        </div>
      )}

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_9rem]">
        <label className="text-muted">
          Prochaine action
          <input
            defaultValue={idee.prochaine_action ?? ""}
            onBlur={(e) => e.target.value !== (idee.prochaine_action ?? "") && patch({ prochaine_action: e.target.value })}
            placeholder="Une action concrète"
            className={`${inputCls} mt-0.5`}
          />
        </label>
        <label className="text-muted">
          Pour le
          <input
            type="date"
            value={idee.action_date ?? ""}
            min="2020-01-01"
            max={FOLLOW_UP_MAX}
            onChange={(e) => patch({ action_date: e.target.value || null })}
            className={`${inputCls} mt-0.5`}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {idee.statut !== "en_action" && (
          <button disabled={pending || !idee.prochaine_action} onClick={() => patch({ statut: "en_action" })} className={goldBtn}>
            Valider l&apos;action
          </button>
        )}
        <button disabled={pending} onClick={() => run(() => convertirIdee(idee.id, "tache"), () => setIdee((i) => ({ ...i, statut: "en_action", convertie_en: "tache" })))} className={ghostBtn}>
          Transformer en tâche
        </button>
        <button disabled={pending} onClick={() => setAsk(ask === "prospect" ? null : "prospect")} className={ghostBtn}>
          En prospect
        </button>
        <button disabled={pending} onClick={() => setAsk(ask === "candidature" ? null : "candidature")} className={ghostBtn}>
          En candidature
        </button>
        {idee.statut !== "classee" && (
          <button disabled={pending} onClick={() => patch({ statut: "classee" })} className={ghostBtn}>
            Classer
          </button>
        )}
        {idee.statut === "classee" && (
          <button disabled={pending} onClick={() => patch({ statut: "a_traiter" })} className={ghostBtn}>
            Rouvrir
          </button>
        )}
      </div>

      {ask && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input value={who} onChange={(e) => setWho(e.target.value)} placeholder={ask === "prospect" ? "Nom du prospect" : "Nom du candidat"} className={`${inputCls} max-w-[14rem]`} />
          <button
            disabled={pending || !who.trim()}
            onClick={() =>
              run(
                () => convertirIdee(idee.id, ask, who),
                () => {
                  setIdee((i) => ({ ...i, statut: "en_action", convertie_en: ask }));
                  setAsk(null);
                  setWho("");
                }
              )
            }
            className={goldBtn}
          >
            Créer
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-muted">
        <span>Privée par défaut.</span>
        {idee.partagee_avec ? (
          <button disabled={pending} onClick={() => { setIdee((i) => ({ ...i, partagee_avec: null })); run(() => partagerIdee(idee.id, null)); }} className={ghostBtn}>
            Ne plus partager
          </button>
        ) : (
          <>
            {!isJustice && (
              <button disabled={pending} onClick={() => { setIdee((i) => ({ ...i, partagee_avec: "justice" })); run(() => partagerIdee(idee.id, "justice")); }} className={ghostBtn}>
                Partager à Justice
              </button>
            )}
            {hasParrain && (
              <button disabled={pending} onClick={() => { setIdee((i) => ({ ...i, partagee_avec: "parrain" })); run(() => partagerIdee(idee.id, "parrain")); }} className={ghostBtn}>
                Partager à mon parrain
              </button>
            )}
          </>
        )}
        {idee.partagee_avec && <span className="font-bold text-ink">· partagée</span>}
      </div>
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

export function IdeesBoard({
  hasParrain,
  isJustice,
  ideas: initialIdeas,
  shared,
  tiroirs,
  usingDefaultList,
}: {
  hasParrain: boolean;
  isJustice: boolean;
  ideas: Idee[];
  shared: SharedIdee[];
  tiroirs: { numero: number; nom: string; famille: string | null }[];
  usingDefaultList: boolean;
}) {
  const [vue, setVue] = useState<Vue>("a_traiter");
  const [gone, setGone] = useState<Set<string>>(new Set());
  const ideas = useMemo(() => initialIdeas.filter((i) => !gone.has(i.id)), [initialIdeas, gone]);
  const names = tiroirs.map((t) => t.nom);

  const list = {
    a_traiter: ideas.filter(isPending),
    en_action: ideas.filter((i) => i.statut === "en_action"),
    classees: ideas.filter((i) => i.statut === "classee"),
  };
  const tabs: { key: Vue; label: string; n: number }[] = [
    { key: "a_traiter", label: "À traiter", n: list.a_traiter.length },
    { key: "tiroirs", label: "Par tiroir", n: ideas.length },
    { key: "en_action", label: "En action", n: list.en_action.length },
    { key: "classees", label: "Classées", n: list.classees.length },
    ...(shared.length > 0 ? [{ key: "partagees" as Vue, label: "Partagées avec moi", n: shared.length }] : []),
  ];

  const card = (i: Idee) => <IdeeCard key={i.id} idee={i} tiroirs={names} hasParrain={hasParrain} isJustice={isJustice} onGone={(id) => setGone((g) => new Set(g).add(id))} />;

  // Vue « Par tiroir » : les tiroirs dans l'ordre, puis les idées sans tiroir
  const byTiroir = tiroirs
    .map((t) => ({ nom: t.nom, items: ideas.filter((i) => i.tiroir === t.nom) }))
    .concat([{ nom: "Sans tiroir", items: ideas.filter((i) => !i.tiroir || !names.includes(i.tiroir)) }])
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink">
            <Lightbulb size={20} className="text-gold" /> Mes idées
          </h2>
          <p className="mt-1 text-xs text-muted">Ne fais jamais confiance à ta mémoire : capture tout de suite, décide ensuite. Tes idées sont privées.</p>
        </div>
        <button onClick={() => window.dispatchEvent(new Event("pmt:capture-idee"))} className="flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-2 text-xs font-bold text-night">
          <Mic size={14} /> Capturer
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setVue(t.key)}
            className={`rounded-full border px-3 py-1 text-xs ${vue === t.key ? "border-gold bg-card-alt font-bold text-gold-light" : "border-line text-muted"}`}
          >
            {t.label} · {t.n}
          </button>
        ))}
      </div>

      {usingDefaultList && vue === "tiroirs" && <p className="mb-2 text-[11px] text-muted">Liste de tiroirs par défaut (version simplifiée). L&apos;administrateur peut la modifier.</p>}

      <div className="flex flex-col gap-3">
        {vue === "tiroirs" ? (
          byTiroir.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-5 text-center text-sm text-muted">Aucune idée pour l&apos;instant : utilise le bouton « Idée » en bas de l&apos;écran.</div>
          ) : (
            byTiroir.map((g) => (
              <div key={g.nom}>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                  {g.nom} · {g.items.length}
                </div>
                <div className="flex flex-col gap-3">{g.items.map(card)}</div>
              </div>
            ))
          )
        ) : vue === "partagees" ? (
          shared.map((i) => (
            <div key={i.id} className="rounded-2xl border border-line bg-card p-3.5 text-xs">
              <div className="text-[11px] text-muted">
                {i.auteur} · {dateLabel(i.cree_le)} {i.tiroir ? `· ${i.tiroir}` : ""}
              </div>
              <div className="mt-1 text-sm font-bold text-ink">{i.reformulation ?? i.texte_brut}</div>
              {i.reformulation && <div className="mt-1 text-muted">Idée brute : {i.texte_brut}</div>}
              {i.prochaine_action && (
                <div className="mt-1 text-muted">
                  <span className="font-bold text-ink">Prochaine action :</span> {i.prochaine_action}
                </div>
              )}
            </div>
          ))
        ) : list[vue].length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-5 text-center text-sm text-muted">
            {vue === "a_traiter" ? "Rien à traiter : bravo. Capture ta prochaine idée dès qu'elle arrive." : "Rien ici pour l'instant."}
          </div>
        ) : (
          list[vue].map(card)
        )}
      </div>
    </div>
  );
}
