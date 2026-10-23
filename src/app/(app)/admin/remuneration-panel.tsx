"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { eur, rankLabel, type BaremeRow, type RattrapageRow, type RemuManuel } from "@/lib/remuneration";
import { fmtDate } from "@/lib/format";
import {
  appliquerRemuneration,
  apercuRemuneration,
  enregistrerRemuManuel,
  retablirCalculAutomatique,
  marquerForfaitsPayes,
  marquerRattrapageVerse,
  recalculerRemuneration,
  type RemuPreview,
  type RemuResult,
} from "./remuneration-actions";

export interface RemuPersonRow {
  id: string;
  name: string;
  rank: string;
  date_demarrage: string;
  agrement_fsma_at: string | null;
  clients: number;
  forfaitsTotal: number;
  forfaitsPayes: number;
  unpaid: number;
  reserve: number;
  unitsTotal: number;
  rattrapage: RattrapageRow | null;
  manuel: RemuManuel | null;
}

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50";

function PreviewBox({ p, title }: { p: RemuPreview; title: string }) {
  const rangs = Object.entries(p.unites_par_rang ?? {});
  return (
    <div className="mt-2 rounded-xl border border-gold bg-card-alt p-2.5 text-xs text-ink">
      <div className="mb-1 font-bold">{title}</div>
      <div>
        {p.clients} client(s) · forfaits {eur(p.forfaits)} · {Math.round(p.unites_cumulees)} unités cumulées
      </div>
      <div>
        Valeur des unités mises de côté : <strong>{eur(p.reserve)}</strong>
        {rangs.length > 0 && <span className="text-muted"> ({rangs.map(([r, u]) => `${Math.round(Number(u))} u. à ${rankLabel(r)}`).join(" · ")})</span>}
      </div>
      <div>
        Rattrapage {p.agrement ? "calculé" : "si l'agrément était obtenu aujourd'hui"} :{" "}
        <strong>{eur(p.rattrapage_calcule ?? p.rattrapage_si_agrement_aujourdhui)}</strong>
      </div>
    </div>
  );
}

const toNum = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));

/** Encodage à la main : ces valeurs remplacent le calcul automatique tant qu'elles sont enregistrées. */
function ManualEditor({ r }: { r: RemuPersonRow }) {
  const m = r.manuel;
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [f, setF] = useState({
    date: r.date_demarrage,
    clients: String(m ? m.nb_clients : r.clients),
    forfaits: String(m ? m.forfaits_total : r.forfaitsTotal),
    payes: String(m ? m.forfaits_payes : r.forfaitsPayes),
    unites: String(m ? Math.round(m.unites * 100) / 100 : Math.round(r.unitsTotal * 100) / 100),
    reserve: String(m ? m.reserve : r.reserve),
    rattrapage: m && m.rattrapage !== null ? String(m.rattrapage) : "",
    note: m?.note ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const save = () =>
    start(async () => {
      const res = await enregistrerRemuManuel(r.id, {
        dateDemarrage: f.date,
        nbClients: toNum(f.clients),
        forfaitsTotal: toNum(f.forfaits),
        forfaitsPayes: toNum(f.payes),
        unites: toNum(f.unites),
        reserve: toNum(f.reserve),
        rattrapage: f.rattrapage.trim() === "" ? null : toNum(f.rattrapage),
        note: f.note,
      });
      setMsg(res.ok ? (res.message ?? "Enregistré.") : res.error);
    });
  const back = () =>
    start(async () => {
      const res = await retablirCalculAutomatique(r.id);
      setMsg(res.ok ? (res.message ?? "Fait.") : res.error);
    });
  const field = (label: string, k: keyof typeof f, type = "text", hint?: string) => (
    <label className="flex flex-col gap-0.5 text-muted">
      {label}
      <input type={type} value={f[k]} inputMode={type === "text" ? "decimal" : undefined} onChange={set(k)} className={inputCls} />
      {hint && <span className="text-[10px]">{hint}</span>}
    </label>
  );
  return (
    <details className="mt-2 rounded-lg border border-line p-2" open={!!m}>
      <summary className="cursor-pointer font-bold text-ink">
        Encoder à la main {m ? <span className="font-normal text-gold-light">· valeurs encodées actives</span> : <span className="font-normal text-muted">· calcul automatique</span>}
      </summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {field("Date de début", "date", "date")}
        {field("Nombre de clients", "clients")}
        {field("Forfaits dus (€)", "forfaits")}
        {field("Forfaits déjà payés (€)", "payes")}
        {field("Unités cumulées", "unites")}
        {field("Valeur des unités mises de côté (€)", "reserve")}
        {field("Rattrapage (€)", "rattrapage", "text", "Vide = réserve − forfaits")}
        <label className="flex flex-col gap-0.5 text-muted sm:col-span-2">
          Note
          <input value={f.note} onChange={set("note")} className={inputCls} />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button disabled={pending} onClick={save} className={goldBtn}>
          Enregistrer ces valeurs
        </button>
        {m && (
          <button disabled={pending} onClick={back} className={ghostBtn}>
            Revenir au calcul automatique
          </button>
        )}
        {msg && <span className="text-[11px] text-ink">{msg}</span>}
      </div>
      <div className="mt-1 text-[11px] text-muted">
        Ces valeurs remplacent le calcul automatique dans « Revenus » du collaborateur et dans la réserve de rattrapage. Le recalcul automatique ne les modifie pas.
      </div>
    </details>
  );
}

function PersonRow({ r, today }: { r: RemuPersonRow; today: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<RemuPreview | null>(null);
  const [date, setDate] = useState(today);
  const run = (fn: () => Promise<RemuResult>, showPreview = false) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(res.message ?? null);
      if (showPreview || res.preview) setPreview(res.preview ?? null);
    });
  const agreed = !!r.agrement_fsma_at;
  return (
    <div className="rounded-xl border border-line bg-card-alt p-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-ink">{r.name}</div>
          <div className="text-muted">
            {agreed ? `Sous-agent depuis le ${fmtDate(r.agrement_fsma_at)}` : "Apporteur d'affaires"} · démarrage {fmtDate(r.date_demarrage)} · rang {rankLabel(r.rank)}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button disabled={pending} onClick={() => run(() => apercuRemuneration(r.id), true)} className={ghostBtn}>
            Aperçu du recalcul
          </button>
          <button disabled={pending} onClick={() => run(() => recalculerRemuneration(r.id))} className={ghostBtn}>
            Recalculer
          </button>
        </div>
      </div>
      <div className="mt-2 grid gap-x-4 gap-y-1 text-muted sm:grid-cols-2">
        <div>
          Clients : <strong className="text-ink">{r.clients}</strong> · forfaits dus : <strong className="text-ink">{eur(r.forfaitsTotal)}</strong> (payés : {eur(r.forfaitsPayes)})
        </div>
        <div>
          Unités : <strong className="text-ink">{Math.round(r.unitsTotal)}</strong> · valeur en réserve : <strong className="text-ink">{eur(r.reserve)}</strong>
        </div>
        <div className="sm:col-span-2">
          Rattrapage :{" "}
          {r.rattrapage ? (
            <strong className="text-ink">
              {eur(r.rattrapage.montant)} calculé le {fmtDate(r.rattrapage.calcule_le)}
              {r.rattrapage.verse_le ? ` · versé le ${fmtDate(r.rattrapage.verse_le)}` : " · à verser"}
            </strong>
          ) : (
            <span>pas encore calculé (agrément FSMA non obtenu)</span>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        {r.unpaid > 0 && (
          <button disabled={pending} onClick={() => run(() => marquerForfaitsPayes(r.id, date))} className={ghostBtn}>
            Marquer {r.unpaid} forfait(s) payé(s)
          </button>
        )}
        {r.rattrapage && !r.rattrapage.verse_le && (
          <button disabled={pending} onClick={() => run(() => marquerRattrapageVerse(r.id, date))} className={goldBtn}>
            Rattrapage versé
          </button>
        )}
      </div>
      <ManualEditor key={JSON.stringify(r.manuel) + r.date_demarrage} r={r} />
      {preview && <PreviewBox p={preview} title="Résultat du recalcul" />}
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

function AddPerson({ candidates, today }: { candidates: { id: string; name: string }[]; today: string }) {
  const [id, setId] = useState("");
  const [date, setDate] = useState(today);
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<RemuPreview | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const run = (apply: boolean) =>
    start(async () => {
      const res = apply ? await appliquerRemuneration(id, date) : await apercuRemuneration(id);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(res.message ?? null);
      setPreview(res.preview ?? null);
    });
  return (
    <div className="mt-3 rounded-xl border border-line p-2.5 text-xs">
      <div className="mb-1.5 font-bold text-ink">Ajouter un collaborateur au nouveau système</div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={id} onChange={(e) => setId(e.target.value)} className={inputCls}>
          <option value="">Choisir…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-muted">
          Démarré le
          <input type="date" value={date} min="2025-09-01" onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        <button disabled={pending || !id} onClick={() => run(false)} className={ghostBtn}>
          Aperçu de l&apos;historique
        </button>
        <button disabled={pending || !id || !date} onClick={() => run(true)} className={goldBtn}>
          Enregistrer
        </button>
      </div>
      <div className="mt-1 text-[11px] text-muted">L&apos;aperçu n&apos;écrit rien. « Enregistrer » pose la date de démarrage et recalcule tout l&apos;historique de cette personne.</div>
      {preview && <PreviewBox p={preview} title="Aperçu de l'historique" />}
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

function BaremeLine({ b }: { b: BaremeRow }) {
  const supabase = createClient();
  const [f, setF] = useState(b);
  const [note, setNote] = useState<string | null>(null);
  const num = (v: string) => (v === "" ? null : Number(v));
  const save = async () => {
    const { error } = await supabase
      .from("bareme_forfait_client")
      .update({ rang_min: f.rang_min, rang_max: f.rang_max, montant: f.montant, date_effet: f.date_effet })
      .eq("id", b.id!);
    setNote(error ? error.message : "Enregistré");
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={f.rang_min} inputMode="numeric" onChange={(e) => setF({ ...f, rang_min: Number(e.target.value) })} className={`${inputCls} w-16`} />
      <span className="text-muted">à</span>
      <input value={f.rang_max ?? ""} placeholder="et +" inputMode="numeric" onChange={(e) => setF({ ...f, rang_max: num(e.target.value) })} className={`${inputCls} w-16`} />
      <input value={f.montant} inputMode="decimal" onChange={(e) => setF({ ...f, montant: Number(e.target.value) })} className={`${inputCls} w-20`} />
      <span className="text-muted">€ dès le</span>
      <input type="date" value={f.date_effet} onChange={(e) => setF({ ...f, date_effet: e.target.value })} className={inputCls} />
      <button onClick={save} className={ghostBtn}>
        Enregistrer
      </button>
      {note && <span className="text-[11px] text-ink">{note}</span>}
    </div>
  );
}

function ValeurLine({ rang, valeur }: { rang: string; valeur: number }) {
  const supabase = createClient();
  const [v, setV] = useState(String(valeur));
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-ink">{rankLabel(rang)}</span>
      <input value={v} inputMode="decimal" onChange={(e) => setV(e.target.value)} className={`${inputCls} w-20`} />
      <span className="text-muted">€ le point</span>
      <button
        onClick={async () => {
          const { error } = await supabase.from("valeur_point_rang").update({ valeur: Number(v) }).eq("rang", rang);
          setNote(error ? error.message : "Enregistré");
        }}
        className={ghostBtn}
      >
        Enregistrer
      </button>
      {note && <span className="text-[11px] text-ink">{note}</span>}
    </div>
  );
}

export function RemunerationPanel({
  rows,
  candidates,
  bareme,
  valeurs,
  today,
}: {
  rows: RemuPersonRow[];
  candidates: { id: string; name: string }[];
  bareme: BaremeRow[];
  valeurs: { rang: string; valeur: number }[];
  today: string;
}) {
  const pending = rows.filter((r) => r.rattrapage && !r.rattrapage.verse_le);
  return (
    <div>
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">Rémunération des nouveaux (démarrés depuis le 1er septembre 2025)</h3>
      <p className="mb-3 text-xs text-muted">
        Concerne uniquement FT1 à FT3 : le rang FA et au-dessus n&apos;est pas affecté. Apporteur d&apos;affaires avant l&apos;agrément FSMA (forfait par client), puis sous-agent (unités × valeur du point du rang à la souscription) avec un rattrapage calculé une fois.
      </p>

      {pending.length > 0 && (
        <div className="mb-3 rounded-xl border border-gold p-2.5 text-xs font-bold text-ink">
          {pending.map((r) => (
            <div key={r.id}>
              Rattrapage à verser à {r.name} : {eur(r.rattrapage!.montant)}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.length === 0 ? <div className="text-xs text-muted">Personne n&apos;est encore dans le nouveau système.</div> : rows.map((r) => <PersonRow key={r.id} r={r} today={today} />)}
      </div>

      <AddPerson candidates={candidates} today={today} />

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-bold text-ink">Barème du forfait par client et valeur du point</summary>
        <div className="mt-2 flex flex-col gap-2">
          {bareme.map((b) => (
            <BaremeLine key={b.id} b={b} />
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {valeurs.map((v) => (
            <ValeurLine key={v.rang} rang={v.rang} valeur={v.valeur} />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Un changement de barème s&apos;applique aux clients signés à partir de sa date d&apos;effet. Les valeurs du point déjà figées sur les contrats existants ne changent pas.
        </p>
      </details>
    </div>
  );
}
