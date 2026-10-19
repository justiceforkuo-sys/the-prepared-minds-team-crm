"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { FSMA_MODULES, PHASE_LABEL, type Etape, type FsmaModule, type Phase } from "@/lib/parcours";
import { checkStoryNames, markAnterieur, startParcours } from "./actions";
import type { Story } from "./mentor-cohort";

export interface MigrationPerson {
  id: string;
  name: string;
  rank: string;
  mentor: string | null;
  oldDone: number;
  oldTotal: number;
  units: number;
}

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50";

function Section({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="mb-3 rounded-2xl border border-line bg-card p-3.5">
      <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-muted">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function MigrationRow({ p, today }: { p: MigrationPerson; today: string }) {
  const [date, setDate] = useState(today);
  const [mods, setMods] = useState<FsmaModule[]>([]);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const toggle = (m: FsmaModule) => setMods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? "Fait : recharge la page pour voir le résultat." : (res.error ?? "Erreur"));
    });
  return (
    <div className="rounded-xl border border-line bg-card-alt p-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-ink">{p.name}</div>
          <div className="text-muted">
            {p.rank}
            {p.mentor ? ` · parrain : ${p.mentor}` : ""} · ancien Fast Start {p.oldDone}/{p.oldTotal} · {Math.round(p.units)} unités au total
          </div>
        </div>
        <button disabled={pending} onClick={() => run(() => markAnterieur(p.id))} className={ghostBtn}>
          Parcours antérieur terminé
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-muted">
          Date d&apos;intégration
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        {FSMA_MODULES.map((m) => (
          <label key={m} className="flex items-center gap-1 text-muted">
            <input type="checkbox" checked={mods.includes(m)} onChange={() => toggle(m)} /> {m}
          </label>
        ))}
        <button disabled={pending || !date} onClick={() => run(() => startParcours(p.id, date, mods))} className={goldBtn}>
          Placer dans le parcours
        </button>
      </div>
      <div className="mt-1 text-[11px] text-muted">Coche les modules déjà réussis. Les unités comptent à partir de la date d&apos;intégration.</div>
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

function EtapeRow({ e }: { e: Etape }) {
  const supabase = createClient();
  const [f, setF] = useState(e);
  const [note, setNote] = useState<string | null>(null);
  const save = async () => {
    const { error } = await supabase
      .from("parcours_etapes")
      .update({
        titre: f.titre,
        avec_qui: f.avec_qui,
        victoire: f.victoire,
        etage_technique: f.etage_technique,
        etage_savoir_etre: f.etage_savoir_etre,
        jour_debut: f.jour_debut,
        jour_fin: f.jour_fin,
        necessite_agrement: f.necessite_agrement,
        actif: f.actif,
      })
      .eq("id", e.id);
    setNote(error ? error.message : "Enregistré");
  };
  const num = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className="rounded-xl border border-line bg-card-alt p-2.5 text-xs">
      <div className="grid gap-2 md:grid-cols-[1fr_5rem_5rem]">
        <input value={f.titre} onChange={(ev) => setF({ ...f, titre: ev.target.value })} className={inputCls} />
        <input value={f.jour_debut ?? ""} placeholder="Jour début" inputMode="numeric" onChange={(ev) => setF({ ...f, jour_debut: num(ev.target.value) })} className={inputCls} />
        <input value={f.jour_fin ?? ""} placeholder="Jour fin" inputMode="numeric" onChange={(ev) => setF({ ...f, jour_fin: num(ev.target.value) })} className={inputCls} />
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <input value={f.avec_qui ?? ""} placeholder="Avec qui" onChange={(ev) => setF({ ...f, avec_qui: ev.target.value })} className={inputCls} />
        <input value={f.victoire ?? ""} placeholder="Victoire attendue" onChange={(ev) => setF({ ...f, victoire: ev.target.value })} className={inputCls} />
        <input value={f.etage_technique ?? ""} placeholder="Étage technique" onChange={(ev) => setF({ ...f, etage_technique: ev.target.value })} className={inputCls} />
        <input value={f.etage_savoir_etre ?? ""} placeholder="Savoir-être" onChange={(ev) => setF({ ...f, etage_savoir_etre: ev.target.value })} className={inputCls} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-muted">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={f.necessite_agrement} onChange={(ev) => setF({ ...f, necessite_agrement: ev.target.checked })} /> Nécessite l&apos;agrément FSMA
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={f.actif} onChange={(ev) => setF({ ...f, actif: ev.target.checked })} /> Active
        </label>
        {e.auto_regle && <span>Règle auto : {e.auto_regle}</span>}
        <button onClick={save} className={goldBtn}>
          Enregistrer
        </button>
        {note && <span className="text-ink">{note}</span>}
      </div>
    </div>
  );
}

function StoryRow({ s }: { s: Story }) {
  const supabase = createClient();
  const [f, setF] = useState(s);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const names = await checkStoryNames(f.histoire);
      if (names.length > 0) {
        setNote(`Jamais de nom de client devant la team : retire « ${names.join(" », « ")} » avant d'enregistrer.`);
        return;
      }
      const { error } = await supabase
        .from("histoires")
        .update({ theme: f.theme, histoire: f.histoire, question_groupe: f.question_groupe, semaine_prevue: f.semaine_prevue })
        .eq("id", s.id);
      setNote(error ? error.message : "Enregistré");
    });
  return (
    <div className="rounded-xl border border-line bg-card-alt p-2.5 text-xs">
      <div className="grid gap-2 md:grid-cols-[1fr_6rem]">
        <input value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })} className={inputCls} />
        <input value={f.semaine_prevue ?? ""} placeholder="Semaine" inputMode="numeric" onChange={(e) => setF({ ...f, semaine_prevue: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
      </div>
      <textarea value={f.histoire} onChange={(e) => setF({ ...f, histoire: e.target.value })} rows={4} placeholder="L'histoire (sans nom de client)" className={`${inputCls} mt-2 w-full`} />
      <input value={f.question_groupe ?? ""} onChange={(e) => setF({ ...f, question_groupe: e.target.value })} placeholder="Question au groupe" className={`${inputCls} mt-2 w-full`} />
      <div className="mt-2 flex flex-wrap items-center gap-3 text-muted">
        <button disabled={pending} onClick={save} className={goldBtn}>
          Enregistrer
        </button>
        {s.racontee_le && <span>Racontée le {s.racontee_le}</span>}
        {note && <span className="text-ink">{note}</span>}
      </div>
    </div>
  );
}

export function AdminParcours({
  migration,
  etapes,
  stories,
  today,
}: {
  migration: MigrationPerson[];
  etapes: Etape[];
  stories: Story[];
  today: string;
}) {
  const supabase = createClient();
  const [addPhase, setAddPhase] = useState<Phase>("victoires");
  const [adding, setAdding] = useState(false);

  const addEtape = async () => {
    setAdding(true);
    await supabase.from("parcours_etapes").insert({ phase: addPhase, ordre: 999, titre: "Nouvelle étape" });
    setAdding(false);
    window.location.reload();
  };

  return (
    <div className="mt-6">
      <h3 className="mb-2 font-serif text-lg font-semibold text-ink">Administration du parcours</h3>

      <Section title={`Migration des collaborateurs en place (${migration.length})`} open={migration.length > 0}>
        {migration.length === 0 ? (
          <p className="text-xs text-muted">Tous les collaborateurs ont un parcours (actif ou antérieur terminé).</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">
              L&apos;ancien Fast Start à 9 étapes est archivé (rien n&apos;est supprimé). Pour chaque personne : place-la à la bonne étape du nouveau parcours, ou marque son parcours antérieur comme terminé.
            </p>
            <div className="flex flex-col gap-2">
              {migration.map((p) => (
                <MigrationRow key={p.id} p={p} today={today} />
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="Étapes du parcours (modèle modifiable)">
        <div className="flex flex-col gap-4">
          {(Object.keys(PHASE_LABEL) as Phase[]).map((phase) => {
            const list = etapes.filter((e) => e.phase === phase);
            return (
              <div key={phase}>
                <div className="mb-1.5 text-xs font-bold text-ink">{PHASE_LABEL[phase]}</div>
                <div className="flex flex-col gap-2">{list.map((e) => <EtapeRow key={e.id} e={e} />)}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <select value={addPhase} onChange={(e) => setAddPhase(e.target.value as Phase)} className={inputCls}>
            {(Object.keys(PHASE_LABEL) as Phase[]).map((p) => (
              <option key={p} value={p}>
                {PHASE_LABEL[p]}
              </option>
            ))}
          </select>
          <button disabled={adding} onClick={addEtape} className={ghostBtn}>
            Ajouter une étape
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">Les règles automatiques (unités, modules, liste des 100…) sont liées au code : pour en changer, demande-le moi.</p>
      </Section>

      <Section title="Banque d'histoires (savoir-être)">
        <div className="flex flex-col gap-2">
          {stories.map((s) => (
            <StoryRow key={s.id} s={s} />
          ))}
        </div>
      </Section>
    </div>
  );
}
