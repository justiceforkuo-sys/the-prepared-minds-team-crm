"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { FORMATS_RDV_CHASSE, STATUTS_CHASSE, TYPES_STRUCTURE } from "@/lib/entrainement-partenaires";
import { ajouterStructure, enregistrerStructure, supprimerStructure, type ChasseChamps } from "./actions";

export interface ChasseLigne {
  id: string;
  nom: string;
  type: string;
  zone: string | null;
  statut: string;
  contact_nom: string | null;
  contact_tel: string | null;
  contact_email: string | null;
  /** Rendez-vous en heure de Bruxelles, au format du champ datetime-local ; "" s'il n'y en a pas. */
  rdv_local: string;
  rdv_affiche: string;
  rdv_format: string | null;
  rdv_lieu: string | null;
  confirmation_envoyee: boolean;
  dernier_appel: string | null;
  nb_appels: number;
  notes: string | null;
}

const STATUT = new Map<string, (typeof STATUTS_CHASSE)[number]>(STATUTS_CHASSE.map((s) => [s.id, s]));
const TYPE = new Map<string, string>(TYPES_STRUCTURE.map((t) => [t.id, t.label]));

const champ = "w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";

function enChamps(l: ChasseLigne): ChasseChamps {
  return {
    nom: l.nom,
    type: l.type,
    zone: l.zone ?? "",
    statut: l.statut,
    contact_nom: l.contact_nom ?? "",
    contact_tel: l.contact_tel ?? "",
    contact_email: l.contact_email ?? "",
    rdv_at: l.rdv_local,
    rdv_format: l.rdv_format ?? "",
    rdv_lieu: l.rdv_lieu ?? "",
    confirmation_envoyee: l.confirmation_envoyee,
    nb_appels: l.nb_appels,
    notes: l.notes ?? "",
  };
}

function Fiche({ l, onDone }: { l: ChasseLigne; onDone: () => void }) {
  const [f, setF] = useState<ChasseChamps>(enChamps(l));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ChasseChamps>(k: K, v: ChasseChamps[K]) => setF((x) => ({ ...x, [k]: v }));

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
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-muted">
          Nom
          <input className={champ} value={f.nom} onChange={(e) => set("nom", e.target.value)} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Zone
          <input className={champ} value={f.zone} onChange={(e) => set("zone", e.target.value)} maxLength={120} />
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
          Contact (nom professionnel)
          <input className={champ} value={f.contact_nom} onChange={(e) => set("contact_nom", e.target.value)} maxLength={120} />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          Téléphone professionnel
          <input className={champ} value={f.contact_tel} onChange={(e) => set("contact_tel", e.target.value)} maxLength={40} inputMode="tel" />
        </label>
        <label className="flex flex-col gap-1 text-muted sm:col-span-2">
          E-mail professionnel
          <input className={champ} value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} maxLength={160} inputMode="email" />
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
        <label className="flex flex-col gap-1 text-muted">
          Appels passés
          <input type="number" min={0} max={999} className={champ} value={f.nb_appels} onChange={(e) => set("nb_appels", Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-2 pt-5 text-ink">
          <input type="checkbox" checked={f.confirmation_envoyee} onChange={(e) => set("confirmation_envoyee", e.target.checked)} />
          Mail de confirmation envoyé
        </label>
      </div>
      <label className="flex flex-col gap-1 text-muted">
        Notes (ce qui a été dit, l&apos;histoire racontée, la suite)
        <textarea className={champ} rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1500} />
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
      {msg && <div className="text-xs text-red">{msg}</div>}
    </div>
  );
}

export function ChasseBoard({ lignes }: { lignes: ChasseLigne[] }) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<string>("tous");
  const [nom, setNom] = useState("");
  const [type, setType] = useState("tarification");
  const [zone, setZone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const aConfirmer = lignes.filter((l) => l.statut === "rdv_fixe" && !l.confirmation_envoyee);
  const ordre = new Map<string, number>(STATUTS_CHASSE.map((s, i) => [s.id as string, i]));
  const visibles = lignes
    .filter((l) => filtre === "tous" || l.statut === filtre)
    .sort((a, b) => (ordre.get(a.statut) ?? 99) - (ordre.get(b.statut) ?? 99) || a.nom.localeCompare(b.nom, "fr"));

  const ajouter = () =>
    start(async () => {
      const res = await ajouterStructure(nom, type, zone);
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

      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
        <button onClick={() => setFiltre("tous")} className={`rounded-full border px-2.5 py-1 ${filtre === "tous" ? "border-gold bg-gold text-night" : "border-line text-muted"}`}>
          Tous ({lignes.length})
        </button>
        {STATUTS_CHASSE.map((s) => {
          const n = lignes.filter((l) => l.statut === s.id).length;
          if (n === 0) return null;
          return (
            <button key={s.id} onClick={() => setFiltre(s.id)} className="rounded-full border px-2.5 py-1" style={filtre === s.id ? { borderColor: s.couleur, background: s.couleur, color: "#fff" } : { borderColor: s.couleur, color: s.couleur }}>
              {s.label} ({n})
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        {visibles.length === 0 && <div className="rounded-xl border border-line bg-card p-3 text-xs text-muted">Aucune structure pour l&apos;instant.</div>}
        {visibles.map((l) => {
          const st = STATUT.get(l.statut);
          return (
            <div key={l.id} className="rounded-xl border border-line bg-card p-2.5 text-xs">
              <button onClick={() => setOuverte(ouverte === l.id ? null : l.id)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
                <span className="min-w-0">
                  <span className="block font-bold text-ink">{l.nom}</span>
                  <span className="text-muted">
                    {TYPE.get(l.type) ?? l.type}
                    {l.zone ? ` · ${l.zone}` : ""}
                    {l.nb_appels > 0 ? ` · ${l.nb_appels} appel${l.nb_appels > 1 ? "s" : ""}` : ""}
                    {l.rdv_affiche ? ` · RDV ${l.rdv_affiche}${l.rdv_format ? (l.rdv_format === "visio" ? " en visio" : " au bureau") : ""}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {l.statut === "rdv_fixe" && !l.confirmation_envoyee && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-night">Confirmation à envoyer</span>}
                  {st && (
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ borderColor: st.couleur, color: st.couleur }}>
                      {st.label}
                    </span>
                  )}
                </span>
              </button>
              {ouverte === l.id && <Fiche l={l} onDone={() => setOuverte(null)} />}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-line bg-card p-3">
        <div className="mb-2 text-sm font-bold text-ink">Ajouter une structure</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={champ} placeholder="Nom de la structure" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} />
          <select className={champ} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES_STRUCTURE.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input className={champ} placeholder="Zone (ville, province)" value={zone} onChange={(e) => setZone(e.target.value)} maxLength={120} />
        </div>
        <button onClick={ajouter} disabled={pending || !nom.trim()} className="mt-2 flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-2 text-xs font-bold text-night disabled:opacity-50">
          <Plus size={13} /> Ajouter
        </button>
        {msg && <div className="mt-1 text-xs text-red">{msg}</div>}
      </div>
    </div>
  );
}
