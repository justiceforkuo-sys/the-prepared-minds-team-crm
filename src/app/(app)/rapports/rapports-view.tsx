"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardCopy, X } from "lucide-react";
import { NIVEAU_COLOR, NIVEAU_LABEL, construireMessage, fmtJourLong, prenomDe, type Ligne, type Niveau } from "@/lib/rapport-hebdo-format";
import type { RapportRow } from "@/lib/rapport-hebdo-gen";
import { genererSemaine, ignorerRapport, publierRapport } from "./actions";

export interface EquipeLigne {
  personId: string;
  name: string;
  rank: string;
  aValider: RapportRow[];
  dernier: RapportRow | null;
}

const goldBtn = "rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "rounded-md border border-line px-3 py-1.5 text-xs text-ink disabled:opacity-50";

function Badge({ niveau, baseline }: { niveau: Niveau; baseline?: boolean }) {
  if (baseline) return <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-muted">Point de départ</span>;
  return (
    <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: NIVEAU_COLOR[niveau], color: NIVEAU_COLOR[niveau] }}>
      {NIVEAU_LABEL[niveau]}
    </span>
  );
}

function Corps({ r, prenom }: { r: RapportRow; prenom: string }) {
  const f = r.faits;
  const faites = r.bilan.filter((b) => b.ok).length;
  return (
    <div className="mt-3 flex flex-col gap-3 text-xs">
      {(r.niveau === 3 || r.niveau === 4) && (
        <div className="rounded-lg border border-[#b3261e] px-3 py-2 font-bold text-[#e0836b]">
          {r.niveau === 3 ? "⚠️ TRÈS IMPORTANT : à lire en entier et à traiter aujourd'hui." : "⚠️ DERNIER RAPPEL : un rendez-vous avec ton coach est nécessaire."}
        </div>
      )}
      <p className="text-ink">Salut {prenomDe(prenom)},</p>
      <p className="text-ink">{r.redaction.ouverture}</p>

      {r.bilan.length > 0 && (
        <div>
          <div className="mb-1 font-bold text-ink">Bilan de la semaine</div>
          <div className="flex flex-col gap-1">
            {r.bilan.map((b) => (
              <div key={b.id} className="flex items-start gap-2 rounded-lg bg-card-alt px-2.5 py-1.5">
                {b.ok ? <Check size={14} className="mt-0.5 flex-shrink-0 text-[#1f8158]" /> : <X size={14} className="mt-0.5 flex-shrink-0 text-[#b3543a]" />}
                <span className="text-ink">
                  {b.label} <span className="text-muted">: {b.detail ?? `${b.realise} sur ${b.cible}`}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1 font-bold text-ink">
            Résultat : {faites} tâche{faites > 1 ? "s" : ""} faite{faites > 1 ? "s" : ""} sur {r.bilan.length}
            {r.taux !== null ? ` (${Math.round(r.taux * 100)} %)` : ""}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 font-bold text-ink">Où tu en es</div>
        <ul className="list-disc pl-4 text-muted">
          <li>Unités : {Math.round(f.unites * 10) / 10}</li>
          <li>
            Prospects : {f.prospects}
            {f.enListes ? ` (et ${f.enListes} contacts dans tes listes)` : ""}, dont {f.sansRelance} sans date de relance
          </li>
          <li>
            Appels : {f.appels}
            {f.appels ? ` (${f.joints} joints, ${f.rdv} rendez-vous fixé${f.rdv > 1 ? "s" : ""})` : ""}
          </li>
          <li>
            Entraînements : {f.entrainements}
            {f.noteMoyenne !== null ? ` (moyenne ${f.noteMoyenne}/10)` : ""}
          </li>
          <li>Chiffres du jour saisis : {f.chiffresJours} jour{f.chiffresJours > 1 ? "s" : ""}</li>
          <li>
            DV planifiés : {f.dvPlan}, réalisés : {f.dvReal}, recommandations : {f.recos}
          </li>
          <li>Temps dans le CRM : {f.minutes} min</li>
        </ul>
      </div>

      <div>
        <div className="mb-1 font-bold text-ink">À faire cette semaine</div>
        <ol className="list-decimal pl-4 text-ink">
          {r.taches.map((t) => (
            <li key={t.id} className="mb-0.5">
              {t.label} <span className="italic text-muted">({t.ou})</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-ink">{r.redaction.cloture}</p>
      <p className="text-ink">Justice</p>
    </div>
  );
}

function CarteRapport({ r, prenom, ouvert }: { r: RapportRow; prenom: string; ouvert?: boolean }) {
  const [open, setOpen] = useState(!!ouvert);
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
        <span className="text-sm font-bold text-ink">Rapport du {fmtJourLong(r.semaine)}</span>
        <Badge niveau={r.niveau} baseline={!!r.faits.baseline} />
      </button>
      {open && <Corps r={r} prenom={prenom} />}
    </div>
  );
}

function Progres({ lignes, depuis }: { lignes: Ligne[]; depuis: string }) {
  const faites = lignes.filter((l) => l.ok).length;
  return (
    <div className="rounded-2xl border border-gold bg-card p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-bold text-ink">Où tu en es depuis le rapport du {fmtJourLong(depuis)}</div>
        <div className="text-xs text-muted">
          {faites} sur {lignes.length} tâches faites
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1 text-xs">
        {lignes.map((b) => (
          <div key={b.id} className="flex items-start gap-2 rounded-lg bg-card-alt px-2.5 py-1.5">
            {b.ok ? <Check size={14} className="mt-0.5 flex-shrink-0 text-[#1f8158]" /> : <X size={14} className="mt-0.5 flex-shrink-0 text-[#b3543a]" />}
            <span className="text-ink">
              {b.label} <span className="text-muted">: {b.detail}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">Ces tâches sont vérifiées au prochain rapport du vendredi.</p>
    </div>
  );
}

function AValider({ ligne, r }: { ligne: EquipeLigne; r: RapportRow }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const [open, setOpen] = useState(false);
  const copier = async () => {
    const m = construireMessage({ prenom: prenomDe(ligne.name), niveau: r.niveau, baseline: !!r.faits.baseline, serie: r.serie, bilan: r.bilan, taux: r.taux, taches: r.taches, faits: r.faits, redaction: r.redaction });
    try {
      await navigator.clipboard.writeText(`${r.sujet}\n\n${m.text}`);
      setMsg("Message copié (objet + texte).");
    } catch {
      setMsg("Copie impossible : sélectionne le texte à la main.");
    }
  };
  const agir = (fn: typeof publierRapport) =>
    start(async () => {
      const res = await fn(r.id);
      setMsg(res.ok ? res.message : res.error);
      if (res.ok) setFait(true);
    });
  if (fait) return <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink">{ligne.name} : {msg}</div>;
  return (
    <div className="rounded-2xl border p-3.5" style={{ borderColor: NIVEAU_COLOR[r.niveau] }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-ink">{ligne.name}</div>
          <div className="text-[11px] text-muted">{r.sujet}</div>
        </div>
        <Badge niveau={r.niveau} baseline={!!r.faits.baseline} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => setOpen((o) => !o)} className={ghostBtn}>
          {open ? "Masquer" : "Lire"}
        </button>
        <button onClick={copier} className={`${ghostBtn} flex items-center gap-1`}>
          <ClipboardCopy size={12} /> Copier le message
        </button>
        <button disabled={pending} onClick={() => agir(publierRapport)} className={goldBtn}>
          Publier
        </button>
        <button disabled={pending} onClick={() => agir(ignorerRapport)} className={ghostBtn}>
          Ignorer
        </button>
      </div>
      {open && <Corps r={r} prenom={ligne.name} />}
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

export function RapportsView({ prenom, mesRapports, progres, equipe, isAdmin, today }: { prenom: string; mesRapports: RapportRow[]; progres: Ligne[] | null; equipe: EquipeLigne[] | null; isAdmin: boolean; today: string }) {
  const [onglet, setOnglet] = useState<"moi" | "equipe">(equipe && mesRapports.length === 0 ? "equipe" : "moi");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const aValider = (equipe ?? []).flatMap((l) => l.aValider.map((r) => ({ l, r })));

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Mon rapport</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Chaque vendredi soir, le bilan de tes tâches de la semaine, où tu en es, et ce que tu dois faire la semaine suivante. Plus les tâches sont faites, plus le ton est positif ; si elles ne sont pas faites, le rapport devient plus dur.
      </p>

      {equipe && (
        <div className="mb-4 flex gap-2">
          {([["moi", "Mon rapport"], ["equipe", `Équipe${aValider.length ? ` · ${aValider.length} à valider` : ""}`]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setOnglet(id)} className={`rounded-lg border px-3.5 py-2 text-xs font-bold ${onglet === id ? "border-gold bg-line text-gold-light" : "border-line bg-card-alt text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {onglet === "moi" && (
        <div className="flex flex-col gap-3">
          {mesRapports.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">Ton premier rapport arrive vendredi soir. Il fixera ton point de départ et tes tâches de la semaine.</div>
          ) : (
            <>
              {progres && <Progres lignes={progres} depuis={mesRapports[0].semaine} />}
              {mesRapports.map((r, i) => (
                <CarteRapport key={r.id} r={r} prenom={prenom} ouvert={i === 0} />
              ))}
            </>
          )}
        </div>
      )}

      {onglet === "equipe" && equipe && (
        <div className="flex flex-col gap-4">
          {isAdmin && (
            <div className="rounded-2xl border border-line bg-card p-3.5 text-xs">
              <div className="mb-1 font-bold text-ink">Préparer les rapports maintenant</div>
              <p className="mb-2 text-muted">
                Les rapports sont préparés automatiquement le vendredi soir (niveaux 1 et 2 publiés, niveaux 3 et 4 à valider). Ce bouton les prépare tout de suite pour le {fmtJourLong(today)} ; ils arrivent tous « à valider » pour que tu les relises avant publication.
              </p>
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await genererSemaine();
                    setMsg(res.ok ? res.message : res.error);
                  })
                }
                className={goldBtn}
              >
                {pending ? "Préparation en cours (quelques secondes par personne)…" : "Préparer les rapports du jour"}
              </button>
              {msg && <div className="mt-2 text-ink">{msg}</div>}
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-bold text-ink">À valider ({aValider.length})</div>
            {aValider.length === 0 ? (
              <div className="rounded-xl border border-line bg-card p-3 text-xs text-muted">Aucun rapport en attente.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {aValider.map(({ l, r }) => (
                  <AValider key={r.id} ligne={l} r={r} />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-bold text-ink">Suivi de l&apos;équipe</div>
            <div className="flex flex-col gap-1.5">
              {equipe.map((l) => (
                <div key={l.personId} className="rounded-xl border border-line bg-card p-2.5 text-xs">
                  <button onClick={() => setOuvert(ouvert === l.personId ? null : l.personId)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">{l.name}</span>
                      <span className="text-muted">{l.dernier ? `Dernier rapport publié : ${fmtJourLong(l.dernier.semaine)}${l.dernier.taux !== null ? ` · ${Math.round(l.dernier.taux * 100)} % des tâches faites` : ""}${l.dernier.serie > 0 ? ` · ${l.dernier.serie} semaine${l.dernier.serie > 1 ? "s" : ""} de suite sous 50 %` : ""}` : "Aucun rapport publié"}</span>
                    </span>
                    {l.dernier && <Badge niveau={l.dernier.niveau} baseline={!!l.dernier.faits.baseline} />}
                  </button>
                  {ouvert === l.personId && l.dernier && <Corps r={l.dernier} prenom={l.name} />}
                </div>
              ))}
              {equipe.length === 0 && <div className="text-xs text-muted">Aucun collaborateur suivi dans ton équipe.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
