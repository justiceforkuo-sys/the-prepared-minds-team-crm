"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Phone, Plus, Search, Trash2 } from "lucide-react";
import { FORMATS_RDV_CHASSE, STATUTS_CHASSE, TYPES_STRUCTURE } from "@/lib/entrainement-partenaires";
import { ajouterStructure, enregistrerStructure, supprimerStructure, type ChasseChamps } from "./actions";

export interface ChasseLigne {
  id: string;
  nom: string;
  type: string;
  zone: string | null;
  adresse: string | null;
  statut: string;
  priorite: number | null;
  remarque: string | null;
  contact_nom: string | null;
  contact_tel: string | null;
  tel_a_verifier: boolean;
  contact_email: string | null;
  contact_web: string | null;
  /** Rendez-vous en heure de Bruxelles, au format du champ datetime-local ; "" s'il n'y en a pas. */
  rdv_local: string;
  rdv_affiche: string;
  rdv_format: string | null;
  rdv_lieu: string | null;
  confirmation_envoyee: boolean;
  dernier_appel: string | null;
  nb_appels: number;
  prochaine_etape: string | null;
  relance_le: string | null;
  notes: string | null;
}

const STATUT = new Map<string, (typeof STATUTS_CHASSE)[number]>(STATUTS_CHASSE.map((s) => [s.id, s]));
const TYPE = new Map<string, (typeof TYPES_STRUCTURE)[number]>(TYPES_STRUCTURE.map((t) => [t.id, t]));
const ORDRE_STATUT = new Map<string, number>(STATUTS_CHASSE.map((s, i) => [s.id as string, i]));
/** Statuts où une relance n'a plus de sens. */
const CLOS = ["partenaire", "sans_suite", "ecarte"];

const champ = "w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";

function enChamps(l: ChasseLigne): ChasseChamps {
  return {
    nom: l.nom,
    type: l.type,
    zone: l.zone ?? "",
    adresse: l.adresse ?? "",
    statut: l.statut,
    priorite: l.priorite ? String(l.priorite) : "",
    remarque: l.remarque ?? "",
    contact_nom: l.contact_nom ?? "",
    contact_tel: l.contact_tel ?? "",
    tel_a_verifier: l.tel_a_verifier,
    contact_email: l.contact_email ?? "",
    contact_web: l.contact_web ?? "",
    rdv_at: l.rdv_local,
    rdv_format: l.rdv_format ?? "",
    rdv_lieu: l.rdv_lieu ?? "",
    confirmation_envoyee: l.confirmation_envoyee,
    nb_appels: l.nb_appels,
    prochaine_etape: l.prochaine_etape ?? "",
    relance_le: l.relance_le ?? "",
    notes: l.notes ?? "",
  };
}

/** Date YYYY-MM-DD + n jours. */
function plusJours(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const jjmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function lienTel(tel: string | null): string | null {
  if (!tel) return null;
  const premier = tel.split("/")[0].replace(/\(.*?\)/g, "").replace(/[^\d+]/g, "");
  return premier.length >= 8 ? `tel:${premier}` : null;
}

function Fiche({ l, aujourdhui, onDone }: { l: ChasseLigne; aujourdhui: string; onDone: () => void }) {
  const [f, setF] = useState<ChasseChamps>(enChamps(l));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ChasseChamps>(k: K, v: ChasseChamps[K]) => setF((x) => ({ ...x, [k]: v }));

  /** Un résultat d'appel prérempli (statut, compteur, relance, ligne de notes) ; il reste à enregistrer. */
  const appel = (resultat: "pas_de_reponse" | "a_rappeler" | "rdv" | "refus") => {
    const ligneNote = {
      pas_de_reponse: "Pas de réponse",
      a_rappeler: "À rappeler",
      rdv: "Rendez-vous fixé",
      refus: "Pas intéressé",
    }[resultat];
    setF((x) => {
      const nonClos = !CLOS.includes(x.statut) && x.statut !== "rencontre";
      const base = { ...x, nb_appels: x.nb_appels + 1, notes: `[${jjmm(aujourdhui)}] ${ligneNote}${x.notes ? `\n${x.notes}` : ""}` };
      if (resultat === "pas_de_reponse") return { ...base, statut: nonClos && x.statut === "a_appeler" ? "appele" : x.statut, prochaine_etape: "Rappeler", relance_le: plusJours(aujourdhui, 2) };
      if (resultat === "a_rappeler") return { ...base, statut: nonClos && x.statut === "a_appeler" ? "appele" : x.statut, prochaine_etape: "Relancer", relance_le: plusJours(aujourdhui, 5) };
      if (resultat === "rdv") return { ...base, statut: "rdv_fixe", confirmation_envoyee: false, prochaine_etape: "Envoyer le mail de confirmation dans l'heure", relance_le: "" };
      return { ...base, statut: "sans_suite", prochaine_etape: "", relance_le: "" };
    });
    setMsg("Résultat prérempli : complète si besoin, puis enregistre.");
  };

  const enregistrer = () =>
    start(async () => {
      const res = await enregistrerStructure(l.id, f);
      if (!res.ok) return setMsg(res.error);
      setMsg(null);
      onDone();
    });
  const supprimer = () => {
    if (!window.confirm(`Supprimer « ${l.nom} » de ta liste ?`)) return;
    start(async () => {
      const res = await supprimerStructure(l.id);
      if (!res.ok) setMsg(res.error);
    });
  };

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2 text-xs">
      <div>
        <div className="mb-1 font-bold text-ink">Noter un appel</div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["pas_de_reponse", "Pas de réponse"],
              ["a_rappeler", "À rappeler (J+5)"],
              ["rdv", "Rendez-vous fixé"],
              ["refus", "Pas intéressé"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => appel(id)} className="rounded-full border border-gold px-2.5 py-1 text-[11px] font-bold text-gold-light hover:bg-gold hover:text-night">
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-muted">
          Nom
          <input className={champ} value={f.nom} onChange={(e) => set("nom", e.target.value)} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Type
          <select className={champ} value={f.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES_STRUCTURE.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Statut
          <select className={champ} value={f.statut} onChange={(e) => set("statut", e.target.value)}>
            {STATUTS_CHASSE.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Priorité
          <select className={champ} value={f.priorite} onChange={(e) => set("priorite", e.target.value)}>
            <option value="">—</option>
            <option value="1">P1 (en premier)</option>
            <option value="2">P2</option>
            <option value="3">P3</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Contact / décideur
          <input className={champ} value={f.contact_nom} onChange={(e) => set("contact_nom", e.target.value)} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Commune
          <input className={champ} value={f.zone} onChange={(e) => set("zone", e.target.value)} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-muted sm:col-span-2">
          Adresse
          <input className={champ} value={f.adresse} onChange={(e) => set("adresse", e.target.value)} maxLength={200} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Téléphone professionnel
          <input className={champ} value={f.contact_tel} onChange={(e) => set("contact_tel", e.target.value)} maxLength={60} inputMode="tel" />
        </label>
        <label className="flex items-center gap-2 pt-5 text-ink">
          <input type="checkbox" checked={f.tel_a_verifier} onChange={(e) => set("tel_a_verifier", e.target.checked)} />
          Numéro à vérifier
        </label>
        <label className="flex flex-col gap-1 text-muted">
          E-mail professionnel
          <input className={champ} value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} maxLength={160} inputMode="email" />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Site ou formulaire
          <input className={champ} value={f.contact_web} onChange={(e) => set("contact_web", e.target.value)} maxLength={160} />
        </label>
        <label className="flex flex-col gap-1 text-muted sm:col-span-2">
          Remarque (d&apos;où vient ce contact, ce qu&apos;il faut savoir)
          <input className={champ} value={f.remarque} onChange={(e) => set("remarque", e.target.value)} maxLength={300} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Rendez-vous (heure de Bruxelles)
          <input type="datetime-local" className={champ} value={f.rdv_at} onChange={(e) => set("rdv_at", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Format
          <select className={champ} value={f.rdv_format} onChange={(e) => set("rdv_format", e.target.value)}>
            <option value="">—</option>
            {FORMATS_RDV_CHASSE.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-muted sm:col-span-2">
          Adresse du rendez-vous ou lien de visio
          <input className={champ} value={f.rdv_lieu} onChange={(e) => set("rdv_lieu", e.target.value)} maxLength={200} />
        </label>
        <label className="flex items-center gap-2 text-ink sm:col-span-2">
          <input type="checkbox" checked={f.confirmation_envoyee} onChange={(e) => set("confirmation_envoyee", e.target.checked)} />
          Mail de confirmation envoyé
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Prochaine étape
          <input className={champ} value={f.prochaine_etape} onChange={(e) => set("prochaine_etape", e.target.value)} maxLength={160} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Relancer le
          <input type="date" className={champ} value={f.relance_le} onChange={(e) => set("relance_le", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Appels passés
          <input type="number" min={0} max={999} className={champ} value={f.nb_appels} onChange={(e) => set("nb_appels", Number(e.target.value))} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-muted">
        Notes d&apos;appel (ce qui a été dit, l&apos;histoire racontée, la suite)
        <textarea className={champ} rows={4} value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={3000} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={enregistrer} disabled={pending} className="rounded-lg bg-gold px-3.5 py-2 text-xs font-bold text-night disabled:opacity-50">
          {pending ? "Un instant…" : "Enregistrer"}
        </button>
        <button onClick={onDone} className="rounded-lg border border-line px-3 py-2 text-xs text-muted">
          Fermer
        </button>
        <button onClick={supprimer} disabled={pending} className="ml-auto text-muted hover:text-red" aria-label="Supprimer la structure">
          <Trash2 size={15} />
        </button>
      </div>
      {msg && <div className="text-xs text-muted">{msg}</div>}
    </div>
  );
}

export function ChasseBoard({ lignes, aujourdhui }: { lignes: ChasseLigne[]; aujourdhui: string }) {
  const typesPresents = TYPES_STRUCTURE.filter((t) => lignes.some((l) => l.type === t.id));
  const [type, setType] = useState<string>(typesPresents[0]?.id ?? "tous");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");
  const [nom, setNom] = useState("");
  const [typeNouveau, setTypeNouveau] = useState<string>(typesPresents[0]?.id ?? "comptable");
  const [zone, setZone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const aConfirmer = lignes.filter((l) => l.statut === "rdv_fixe" && !l.confirmation_envoyee);
  const aRelancer = lignes.filter((l) => l.relance_le && l.relance_le <= aujourdhui && !CLOS.includes(l.statut));
  const dansType = useMemo(() => lignes.filter((l) => type === "tous" || l.type === type), [lignes, type]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return dansType
      .filter((l) => filtre === "tous" || l.statut === filtre)
      .filter((l) => !q || [l.nom, l.zone, l.contact_nom, l.adresse].some((v) => v?.toLowerCase().includes(q)))
      .sort(
        (a, b) =>
          (ORDRE_STATUT.get(a.statut) ?? 99) - (ORDRE_STATUT.get(b.statut) ?? 99) ||
          (a.priorite ?? 9) - (b.priorite ?? 9) ||
          a.nom.localeCompare(b.nom, "fr"),
      );
  }, [dansType, filtre, recherche]);

  const synthese = typesPresents.map((t) => {
    const d = lignes.filter((l) => l.type === t.id);
    const n = (s: string) => d.filter((l) => l.statut === s).length;
    return { id: t.id, label: t.label, total: d.length, aAppeler: n("a_appeler"), appeles: d.filter((l) => l.nb_appels > 0).length, rdv: n("rdv_fixe") + n("rencontre"), partenaires: n("partenaire"), refus: n("sans_suite") };
  });
  const total = (k: "total" | "aAppeler" | "appeles" | "rdv" | "partenaires" | "refus") => synthese.reduce((t, s) => t + s[k], 0);

  const ajouter = () =>
    start(async () => {
      const res = await ajouterStructure(nom, typeNouveau, zone);
      if (!res.ok) return setMsg(res.error);
      setMsg(null);
      setNom("");
      setZone("");
    });

  return (
    <div className="flex flex-col gap-3">
      {aConfirmer.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-gold bg-card p-3 text-xs text-ink">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-gold-light" />
          <span>
            Mail de confirmation à envoyer dans l&apos;heure après le rendez-vous fixé : <strong>{aConfirmer.map((l) => l.nom).join(", ")}</strong>. Rappelle jour, heure, lieu ou lien, puis coche « Mail de confirmation envoyé ».
          </span>
        </div>
      )}
      {aRelancer.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-line bg-card p-3 text-xs text-ink">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-gold-light" />
          <span>
            À relancer aujourd&apos;hui ou en retard ({aRelancer.length}) : <strong>{aRelancer.slice(0, 8).map((l) => l.nom).join(", ")}</strong>
            {aRelancer.length > 8 ? "…" : ""}
          </span>
        </div>
      )}

      {synthese.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="p-2 font-bold">Structure</th>
                <th className="p-2 font-bold">Contacts</th>
                <th className="p-2 font-bold">À appeler</th>
                <th className="p-2 font-bold">Appelés</th>
                <th className="p-2 font-bold">RDV</th>
                <th className="p-2 font-bold">Partenaires</th>
                <th className="p-2 font-bold">Pas intéressés</th>
              </tr>
            </thead>
            <tbody>
              {synthese.map((s) => (
                <tr key={s.id} className={`cursor-pointer border-t border-line text-ink ${type === s.id ? "bg-card-alt" : ""}`} onClick={() => { setType(s.id); setFiltre("tous"); setOuverte(null); }}>
                  <td className="p-2 font-bold">{s.label}</td>
                  <td className="p-2">{s.total}</td>
                  <td className="p-2">{s.aAppeler}</td>
                  <td className="p-2">{s.appeles}</td>
                  <td className="p-2">{s.rdv}</td>
                  <td className="p-2">{s.partenaires}</td>
                  <td className="p-2">{s.refus}</td>
                </tr>
              ))}
              <tr className="border-t border-line font-bold text-ink">
                <td className="p-2">Total</td>
                <td className="p-2">{total("total")}</td>
                <td className="p-2">{total("aAppeler")}</td>
                <td className="p-2">{total("appeles")}</td>
                <td className="p-2">{total("rdv")}</td>
                <td className="p-2">{total("partenaires")}</td>
                <td className="p-2">{total("refus")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
        <button onClick={() => { setType("tous"); setFiltre("tous"); }} className={`rounded-full border px-2.5 py-1 ${type === "tous" ? "border-gold bg-gold text-night" : "border-line text-muted"}`}>
          Tous ({lignes.length})
        </button>
        {typesPresents.map((t) => (
          <button key={t.id} onClick={() => { setType(t.id); setFiltre("tous"); setOuverte(null); }} className={`rounded-full border px-2.5 py-1 ${type === t.id ? "border-gold bg-gold text-night" : "border-line text-muted"}`}>
            {t.label} ({lignes.filter((l) => l.type === t.id).length})
          </button>
        ))}
      </div>

      {type !== "tous" && TYPE.get(type)?.consigne && <p className="rounded-xl border border-line bg-card p-2.5 text-[11px] text-muted">{TYPE.get(type)?.consigne}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-1.5 rounded-md border border-line bg-card-alt px-2 py-1.5">
          <Search size={13} className="text-muted" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un nom, une commune, un contact…" className="w-full bg-transparent text-xs text-ink outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
          <button onClick={() => setFiltre("tous")} className={`rounded-full border px-2.5 py-1 ${filtre === "tous" ? "border-gold bg-gold text-night" : "border-line text-muted"}`}>
            Tous statuts
          </button>
          {STATUTS_CHASSE.map((s) => {
            const n = dansType.filter((l) => l.statut === s.id).length;
            if (n === 0) return null;
            return (
              <button key={s.id} onClick={() => setFiltre(s.id)} className="rounded-full border px-2.5 py-1" style={filtre === s.id ? { borderColor: s.couleur, background: s.couleur, color: "#fff" } : { borderColor: s.couleur, color: s.couleur }}>
                {s.label} ({n})
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {visibles.length === 0 && <div className="rounded-xl border border-line bg-card p-3 text-xs text-muted">Aucune structure pour l&apos;instant.</div>}
        {visibles.map((l) => {
          const st = STATUT.get(l.statut);
          const tel = lienTel(l.contact_tel);
          const enRetard = !!l.relance_le && l.relance_le <= aujourdhui && !CLOS.includes(l.statut);
          return (
            <div key={l.id} className="rounded-xl border border-line bg-card p-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button onClick={() => setOuverte(ouverte === l.id ? null : l.id)} className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-ink">{l.nom}</span>
                    {l.priorite && <span className="rounded-full border border-gold px-1.5 py-0.5 text-[10px] font-bold text-gold-light">P{l.priorite}</span>}
                  </span>
                  <span className="block text-muted">
                    {type === "tous" ? `${TYPE.get(l.type)?.label ?? l.type} · ` : ""}
                    {l.contact_nom ? `${l.contact_nom} · ` : ""}
                    {l.zone ?? ""}
                    {l.nb_appels > 0 ? ` · ${l.nb_appels} appel${l.nb_appels > 1 ? "s" : ""}` : ""}
                    {l.rdv_affiche ? ` · RDV ${l.rdv_affiche}${l.rdv_format ? (l.rdv_format === "visio" ? " en visio" : " au bureau") : ""}` : ""}
                    {l.prochaine_etape ? ` · ${l.prochaine_etape}` : ""}
                  </span>
                </button>
                <span className="flex flex-wrap items-center gap-1.5">
                  {tel ? (
                    <a href={tel} className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-ink hover:border-gold" title={l.tel_a_verifier ? "Numéro à vérifier" : undefined}>
                      <Phone size={11} /> {l.contact_tel}
                      {l.tel_a_verifier ? " ?" : ""}
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted">pas de numéro</span>
                  )}
                  {enRetard && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-night">À relancer</span>}
                  {l.statut === "rdv_fixe" && !l.confirmation_envoyee && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-night">Confirmation à envoyer</span>}
                  {st && (
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ borderColor: st.couleur, color: st.couleur }}>
                      {st.label}
                    </span>
                  )}
                </span>
              </div>
              {l.remarque && ouverte !== l.id && <div className="mt-1 text-[11px] text-muted">{l.remarque}</div>}
              {ouverte === l.id && <Fiche l={l} aujourdhui={aujourdhui} onDone={() => setOuverte(null)} />}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-line bg-card p-3">
        <div className="mb-2 text-sm font-bold text-ink">Ajouter une structure</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={champ} placeholder="Nom de la structure" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} />
          <select className={champ} value={typeNouveau} onChange={(e) => setTypeNouveau(e.target.value)}>
            {TYPES_STRUCTURE.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input className={champ} placeholder="Commune" value={zone} onChange={(e) => setZone(e.target.value)} maxLength={120} />
        </div>
        <button onClick={ajouter} disabled={pending || !nom.trim()} className="mt-2 flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-2 text-xs font-bold text-night disabled:opacity-50">
          <Plus size={13} /> Ajouter
        </button>
        {msg && <div className="mt-1 text-xs text-red">{msg}</div>}
      </div>
    </div>
  );
}
