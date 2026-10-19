"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Check, Lock, PartyPopper } from "lucide-react";
import { fmtDate } from "@/lib/format";
import {
  AGREMENT_LABEL,
  FSMA_MODULES,
  MAX_DAY,
  MODULE_LABEL,
  PHASE_LABEL,
  STATE_LABEL,
  TARGET_UNITS,
  evalAuto,
  moduleStatut,
  modulesReussis,
  projectUnits,
  recosPerDv,
  stepState,
  weekOf,
  type Ctx,
  type Etape,
  type Phase,
  type Progression,
  type RythmeRow,
  type StepState,
} from "@/lib/parcours";
import { setModule, setRythme, toggleStepDone } from "./actions";

const TONE_COLOR = { ok: "#1f8158", warn: "#e08a3a", late: "#d9534f", none: "#5a6b85", done: "#1f8158" } as const;
const STATE_COLOR: Record<StepState, string> = {
  valide: "#1f8158",
  fait: "#2f5fa8",
  en_retard: "#d9534f",
  en_cours: "#e08a3a",
  a_venir: "#8a97ab",
};

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{title}</div>
      {children}
    </div>
  );
}

const PHASES: Phase[] = ["victoires", "cap_ft2", "autonomie"];

export function NewcomerDashboard({
  ctx,
  etapes,
  progression,
  rythme,
  mentorName,
  evaluationLink,
  celebrate,
  recosToday,
}: {
  ctx: Ctx;
  etapes: Etape[];
  progression: Progression[];
  rythme: RythmeRow[];
  mentorName: string | null;
  evaluationLink: string | null;
  celebrate: boolean;
  recosToday: { ok: boolean; text: string }[];
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const { row, person } = ctx;
  const units = Number(row.units) || 0;
  const day = row.day_n;
  const proj = projectUnits(units, day, row.integration_date);
  const color = TONE_COLOR[proj.tone];
  const agree = person.statut_reglementaire === "agree_fsma";
  const week = weekOf(day);
  const thisWeek = rythme.find((r) => r.semaine === week);
  const recos = recosPerDv(row);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) setMessage(res.error ?? "Action impossible.");
    });

  const stateOf = (e: Etape) => {
    const prog = progression.find((p) => p.etape_id === e.id);
    const auto = evalAuto(e.auto_regle, ctx);
    return { prog, auto, state: stepState(e, prog, auto, day) };
  };

  const trail = etapes.filter((e) => PHASES.includes(e.phase));
  const next = trail.find((e) => {
    const s = stateOf(e).state;
    return s !== "valide" && s !== "fait" && !(e.necessite_agrement && !agree);
  });
  const rhythmSteps = etapes.filter((e) => e.phase === "rythme");
  const validation = etapes.filter((e) => e.phase === "validation");
  const regle = etapes.filter((e) => e.phase === "regle");

  const validationDone = validation.filter((e) => {
    const { prog, auto } = stateOf(e);
    return prog?.valide_at || (["ft2", "agrement"].includes(e.auto_regle ?? "") && auto?.done);
  }).length;

  return (
    <div>
      {celebrate && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-gold bg-card p-3.5 text-sm text-ink">
          <PartyPopper size={18} className="text-gold" />
          <span>
            <strong>1 000 unités atteintes !</strong> Tu passes FT2 / JFA II : ton rang est mis à jour et ton mentor est prévenu.
          </span>
        </div>
      )}
      {message && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-muted">
            Fermer
          </button>
        </div>
      )}

      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Card title="Unités">
          <div className="flex items-baseline justify-between">
            <div className="font-serif text-2xl font-semibold text-ink">
              {Math.round(units)} <span className="text-sm text-muted">/ {TARGET_UNITS.toLocaleString("fr-BE")}</span>
            </div>
            {person.ft2_at && <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] font-bold text-gold-light">FT2 / JFA II</span>}
          </div>
          <div className="my-2">
            <Bar value={units} max={TARGET_UNITS} color={color} />
          </div>
          <div className="text-xs" style={{ color }}>
            Jour {Math.min(day, 999)} sur {MAX_DAY} ·{" "}
            {proj.tone === "done"
              ? "objectif atteint"
              : proj.date
                ? `rythme actuel → 1 000 unités atteintes vers le ${fmtDate(proj.date)}`
                : "pas encore de rythme : ton premier contrat lancera le calcul"}
          </div>
        </Card>

        <Card title="Agrément FSMA">
          <div className="mb-1.5 text-sm font-bold text-ink">
            Modules {modulesReussis(ctx)} / 5 {agree && <span className="ml-1 text-xs text-gold-light">· Agréé</span>}
          </div>
          <div className="flex flex-col gap-1">
            {FSMA_MODULES.map((m) => {
              const st = moduleStatut(ctx, m);
              const date = ctx.modules[m]?.reussi_at;
              return (
                <div key={m} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink">Module {m}</span>
                  <span className="flex items-center gap-1.5">
                    {st === "reussi" ? (
                      <span className="font-bold text-[#1f8158]">Réussi{date ? ` · ${fmtDate(date)}` : ""}</span>
                    ) : (
                      <select
                        value={st}
                        disabled={pending}
                        onChange={(e) => run(() => setModule(person.id, m, e.target.value as "a_faire" | "en_cours"))}
                        className="rounded-md border border-line bg-card-alt px-1.5 py-0.5 text-xs text-ink"
                      >
                        <option value="a_faire">{MODULE_LABEL.a_faire}</option>
                        <option value="en_cours">{MODULE_LABEL.en_cours}</option>
                      </select>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 border-t border-line pt-1.5 text-xs text-muted">
            Examen / dossier d&apos;agrément :{" "}
            <strong className="text-ink">
              {AGREMENT_LABEL[person.agrement_statut]}
              {person.agrement_statut === "obtenu" && person.agrement_fsma_at ? ` (${fmtDate(person.agrement_fsma_at)})` : ""}
              {person.agrement_statut === "depose" && person.agrement_depose_at ? ` (${fmtDate(person.agrement_depose_at)})` : ""}
            </strong>
          </div>
          <div className="mt-1 text-[11px] text-muted">{agree ? "Agréé FSMA — peut conseiller seul." : "En formation : tu suis tes DV avec ton mentor."}</div>
        </Card>

        <Card title="Rendez-vous DV">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-line p-2">
              <div className="text-[11px] text-muted">Cette semaine</div>
              <div className="font-serif text-lg font-semibold text-ink">
                {Number(row.dv_real_week)} <span className="text-xs text-muted">réalisés</span>
              </div>
              <div className="text-xs text-muted">{Number(row.dv_plan_week)} planifiés</div>
            </div>
            <div className="rounded-xl border border-line p-2">
              <div className="text-[11px] text-muted">Depuis le début</div>
              <div className="font-serif text-lg font-semibold text-ink">
                {Number(row.dv_real_total)} <span className="text-xs text-muted">réalisés</span>
              </div>
              <div className="text-xs text-muted">{Number(row.dv_plan_total)} planifiés</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted">
            Avec ton mentor{mentorName ? ` (${mentorName})` : ""}. Recommandations par DV :{" "}
            <strong className={recos !== null && recos >= 5 ? "text-[#1f8158]" : recos !== null ? "text-[#e08a3a]" : "text-ink"}>
              {recos === null ? "—" : `${recos.toFixed(1)} / 5`}
            </strong>
          </div>
          {recosToday.map((a, i) => (
            <div key={i} className={`mt-1 text-[11px] ${a.ok ? "text-muted" : "text-[#e08a3a]"}`}>
              {a.text}
            </div>
          ))}
        </Card>
      </div>

      {next && (
        <div className="mb-3 rounded-2xl border border-gold bg-card p-4">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Ta prochaine étape</div>
          <div className="font-serif text-lg font-semibold text-ink">{next.titre}</div>
          <div className="mt-1 grid gap-1 text-sm text-ink sm:grid-cols-2">
            {next.etage_technique && <div>📌 {next.etage_technique}</div>}
            {next.avec_qui && <div>👥 Avec : {next.avec_qui}</div>}
            {next.victoire && <div className="sm:col-span-2">🏆 Victoire attendue : {next.victoire}</div>}
            {next.etage_savoir_etre && <div className="sm:col-span-2">💡 Savoir-être : {next.etage_savoir_etre}</div>}
          </div>
          {next.jour_debut !== null && (
            <div className="mt-1 text-xs text-muted">
              {next.jour_fin !== null && next.jour_fin !== next.jour_debut ? `Jours ${next.jour_debut} à ${next.jour_fin}` : `Jour ${next.jour_debut}`}
              {next.jour_debut === 2 ? (
                <>
                  {" · "}
                  <Link href="/prospects" className="font-bold text-gold-light underline">
                    Ouvrir Prospects
                  </Link>
                </>
              ) : null}
              {next.jour_debut === 4 ? (
                <>
                  {" · "}
                  <Link href="/scripts" className="font-bold text-gold-light underline">
                    Ouvrir les Scripts
                  </Link>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {PHASES.map((phase) => {
        const list = etapes.filter((e) => e.phase === phase);
        if (list.length === 0) return null;
        return (
          <div key={phase} className="mb-3 rounded-2xl border border-line bg-card p-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{PHASE_LABEL[phase]}</div>
            <div className="flex flex-col gap-2">
              {list.map((e) => {
                const { prog, auto, state } = stateOf(e);
                const locked = e.necessite_agrement && !agree;
                return (
                  <div key={e.id} className="rounded-xl border border-line bg-card-alt p-2.5 text-xs" style={{ borderLeft: `3px solid ${STATE_COLOR[state]}` }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-ink">
                          {e.jour_debut !== null && (
                            <span className="mr-1.5 text-muted">{e.jour_fin !== null && e.jour_fin !== e.jour_debut ? `J${e.jour_debut}-${e.jour_fin}` : `J${e.jour_debut}`}</span>
                          )}
                          {e.titre}
                        </div>
                        {e.avec_qui && <div className="text-muted">Avec : {e.avec_qui}</div>}
                        {e.victoire && <div className="text-ink">🏆 {e.victoire}</div>}
                        {auto && <div className={auto.done ? "text-[#1f8158]" : "text-muted"}>⚙︎ {auto.label}</div>}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="font-bold" style={{ color: STATE_COLOR[state] }}>
                          {STATE_LABEL[state]}
                        </span>
                        {locked ? (
                          <span className="flex items-center gap-1 text-muted">
                            <Lock size={12} /> À valider après l&apos;agrément FSMA
                          </span>
                        ) : !e.auto_regle && state !== "valide" ? (
                          <button
                            disabled={pending}
                            onClick={() => run(() => toggleStepDone(e.id))}
                            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-bold ${prog?.fait_at ? "border border-line text-ink" : "bg-gold text-night"}`}
                          >
                            <Check size={12} /> {prog?.fait_at ? "Annuler" : "C'est fait"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mb-3 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Rythme fixe — semaine {week}</div>
          {evaluationLink && (
            <a href={evaluationLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night">
              <CalendarClock size={13} /> Prendre mon point de 20 min
            </a>
          )}
        </div>
        <div className="flex flex-col gap-1.5 text-xs text-ink">
          {rhythmSteps.map((e) => {
            const auto = evalAuto(e.auto_regle, ctx);
            const done = auto
              ? auto.done
              : e.titre.toLowerCase().startsWith("point")
                ? !!thisWeek?.point_individuel_at
                : !!thisWeek?.victoire_partagee_at;
            const canToggle = !auto && !e.titre.toLowerCase().startsWith("point");
            return (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <span>
                  <span className={done ? "text-[#1f8158]" : "text-muted"}>{done ? "✔" : "○"}</span> {e.titre}
                  {auto && <span className="ml-1 text-muted">({auto.label})</span>}
                  {!auto && e.titre.toLowerCase().startsWith("point") && <span className="ml-1 text-muted">(coché par ton mentor)</span>}
                </span>
                {canToggle && (
                  <button
                    disabled={pending}
                    onClick={() => run(() => setRythme(person.id, week, "victoire_partagee_at", !done))}
                    className="rounded-md border border-line px-2 py-0.5 text-ink"
                  >
                    {done ? "Annuler" : "C'est fait"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {regle.map((e) => {
        const auto = evalAuto(e.auto_regle, ctx);
        return (
          <div key={e.id} className="mb-3 rounded-2xl border border-line bg-card p-3.5 text-xs">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">{PHASE_LABEL.regle}</div>
            <div className="text-sm text-ink">{e.titre}</div>
            {auto && <div className={auto.done ? "mt-1 text-[#1f8158]" : "mt-1 text-[#e08a3a]"}>⚙︎ {auto.label}</div>}
          </div>
        );
      })}

      <div className="mb-3 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{PHASE_LABEL.validation}</div>
          <div className="text-xs font-bold text-ink">
            {validationDone} / {validation.length} {person.autonome_at && <span className="ml-1 rounded-full border border-gold px-2 py-0.5 text-[10px] text-gold-light">Autonome</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-xs text-ink">
          {validation.map((e) => {
            const { prog, auto } = stateOf(e);
            const auto2 = ["ft2", "agrement"].includes(e.auto_regle ?? "") && auto?.done;
            const ok = !!prog?.valide_at || auto2;
            const locked = e.necessite_agrement && !agree;
            return (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <span>
                  <span className={ok ? "text-[#1f8158]" : "text-muted"}>{ok ? "✔" : "○"}</span> {e.titre}
                  {!ok && auto && !auto2 && <span className="ml-1 text-muted">({auto.label})</span>}
                </span>
                {locked && !ok && (
                  <span className="flex flex-shrink-0 items-center gap-1 text-muted">
                    <Lock size={11} /> après l&apos;agrément FSMA
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-muted">Ces points sont cochés par ton mentor, en situation réelle.</div>
      </div>
    </div>
  );
}
