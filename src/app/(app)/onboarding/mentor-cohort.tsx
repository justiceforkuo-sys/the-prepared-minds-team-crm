"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";
import {
  AGREMENT_LABEL,
  FSMA_MODULES,
  MAX_DAY,
  MODULE_LABEL,
  PHASE_LABEL,
  STATE_LABEL,
  TARGET_UNITS,
  computeAlerts,
  evalAuto,
  moduleStatut,
  modulesReussis,
  projectUnits,
  recosPerDv,
  stepState,
  weekOf,
  type AgrementStatut,
  type Ctx,
  type ModuleStatut,
  type Phase,
  type Progression,
  type StepState,
} from "@/lib/parcours";
import type { ParcoursData } from "@/lib/parcours-data";
import { markStoryTold, setAgrement, setAutonome, setModule, setRythme, validateSteps } from "./actions";
import { Bar } from "./newcomer-dashboard";

const TONE_COLOR = { ok: "#1f8158", warn: "#e08a3a", late: "#d9534f", none: "#5a6b85", done: "#1f8158" } as const;
const STATE_COLOR: Record<StepState, string> = { valide: "#1f8158", fait: "#2f5fa8", en_retard: "#d9534f", en_cours: "#e08a3a", a_venir: "#8a97ab" };
const TRAIL: Phase[] = ["victoires", "cap_ft2", "autonomie"];

type Serial = Omit<ParcoursData, "promoted">;

export interface Story {
  id: string;
  theme: string;
  histoire: string;
  question_groupe: string | null;
  semaine_prevue: number | null;
  racontee_le: string | null;
}

function ctxOf(data: Serial, personId: string): Ctx {
  const modules: Ctx["modules"] = {};
  for (const m of data.modules) if (m.user_id === personId) modules[m.module] = m;
  return {
    row: data.rows.find((r) => r.person_id === personId)!,
    person: data.persons[personId],
    modules,
    extras: data.extras[personId] ?? { prospectsSansRelance: 0, recoNonContactees: 0, dvSansRecos: 0 },
  };
}

export function MentorCohort({
  data,
  meId,
  isAdmin,
  story,
  weekday,
  hour,
  myEvaluationLink,
}: {
  data: Serial;
  meId: string;
  isAdmin: boolean;
  story: Story | null;
  weekday: number;
  hour: number;
  myEvaluationLink: string;
}) {
  const supabase = createClient();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState(myEvaluationLink);
  const [savedLink, setSavedLink] = useState(myEvaluationLink);

  const rows = useMemo(() => {
    const list = data.rows.filter((r) => r.person_id !== meId);
    const rank = (r: (typeof list)[number]) => {
      const tone = projectUnits(Number(r.units) || 0, r.day_n, r.integration_date).tone;
      return tone === "late" ? 0 : tone === "warn" ? 1 : tone === "none" ? 2 : tone === "ok" ? 3 : 4;
    };
    return [...list].sort((a, b) => rank(a) - rank(b) || b.day_n - a.day_n);
  }, [data.rows, meId]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? (res.message ?? null) : (res.error ?? "Action impossible."));
    });

  const states = (c: Ctx) => {
    const trail = data.etapes.filter((e) => TRAIL.includes(e.phase));
    return trail.map((e) => {
      const prog = data.progression.find((p) => p.user_id === c.person.id && p.etape_id === e.id);
      const auto = evalAuto(e.auto_regle, c);
      return { etape: e, prog, auto, state: stepState(e, prog, auto, c.row.day_n) };
    });
  };

  const validateAllDone = async () => {
    for (const r of rows) {
      const c = ctxOf(data, r.person_id);
      const ids = states(c)
        .filter((s) => s.state === "fait")
        .map((s) => s.etape.id);
      if (ids.length > 0) await validateSteps(r.person_id, ids, true);
    }
  };

  const saveLink = async () => {
    const value = link.trim();
    if (value === savedLink) return;
    const { data: me } = await supabase.from("people").select("calendly_links").eq("id", meId).single();
    const next = Object.fromEntries(Object.entries({ ...((me?.calendly_links as Record<string, string> | null) ?? {}), evaluation: value }).filter(([, v]) => v));
    const { error } = await supabase.from("people").update({ calendly_links: next }).eq("id", meId);
    if (error) setMessage(`Lien non enregistré : ${error.message}`);
    else {
      setSavedLink(value);
      setMessage("Lien enregistré.");
    }
  };

  if (rows.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold text-ink">Ma cohorte</h3>
        <button
          disabled={pending}
          onClick={() => run(async () => (await validateAllDone(), { ok: true, message: "Étapes faites validées (hors étapes réservées à l'après-agrément)." }))}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50"
        >
          Valider tout ce qui est fait
        </button>
      </div>
      <p className="mb-3 text-xs text-muted">Triés par risque : ceux qui peuvent dépasser J{MAX_DAY} d&apos;abord.</p>

      {message && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-muted">
            Fermer
          </button>
        </div>
      )}

      <div className="mb-3 rounded-2xl border border-line bg-card p-3.5">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
          Mon lien Calendly « ENTRETIEN D&apos;ÉVALUATION Collaborateur » (bouton de point individuel chez mes nouveaux)
        </label>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onBlur={saveLink}
          placeholder="https://calendly.com/…"
          className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-xs text-ink outline-none focus:border-gold"
        />
      </div>

      {story && (
        <div className="mb-3 rounded-2xl border border-gold bg-card p-3.5 text-xs">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Histoire de la semaine : {story.theme}</div>
          {story.histoire.trim() ? <p className="whitespace-pre-line text-sm text-ink">{story.histoire}</p> : <p className="text-muted">Histoire à rédiger par l&apos;admin.</p>}
          {story.question_groupe && <p className="mt-1 font-bold text-ink">Question au groupe : {story.question_groupe}</p>}
          <button
            disabled={pending}
            onClick={() => run(() => markStoryTold(story.id, "mentor"))}
            className="mt-2 rounded-md border border-line px-2.5 py-1 text-ink"
          >
            Marquer comme racontée
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const c = ctxOf(data, r.person_id);
          const units = Number(r.units) || 0;
          const proj = projectUnits(units, r.day_n, r.integration_date);
          const st = states(c);
          const faites = st.filter((s) => s.state === "fait").length;
          const validees = st.filter((s) => s.state === "valide").length;
          const retard = st.filter((s) => s.state === "en_retard").length;
          const recos = recosPerDv(r);
          const alerts = computeAlerts({
            ...c,
            etapes: data.etapes,
            progression: data.progression.filter((p) => p.user_id === r.person_id),
            rythme: data.rythme.filter((x) => x.user_id === r.person_id),
            weekday,
            hour,
          });
          const isOpen = open === r.person_id;
          const agree = c.person.statut_reglementaire === "agree_fsma";
          const week = weekOf(r.day_n);
          const rythmeRow = data.rythme.find((x) => x.user_id === r.person_id && x.semaine === week);
          const validation = data.etapes.filter((e) => e.phase === "validation");
          const validationOk = validation.filter((e) => {
            const prog = data.progression.find((p) => p.user_id === r.person_id && p.etape_id === e.id);
            const auto = evalAuto(e.auto_regle, c);
            return prog?.valide_at || (["ft2", "agrement"].includes(e.auto_regle ?? "") && auto?.done);
          }).length;

          return (
            <div key={r.person_id} className="rounded-2xl border border-line bg-card p-3.5" style={{ borderLeft: `3px solid ${TONE_COLOR[proj.tone]}` }}>
              <button onClick={() => setOpen(isOpen ? null : r.person_id)} className="w-full text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-ink">
                    {r.name} <span className="text-xs font-normal text-muted">· {r.rank} · J{r.day_n} / {MAX_DAY}</span>
                    {alerts.length > 0 && <span className="ml-2 rounded-full border border-red px-1.5 text-[10px] font-bold text-red">{alerts.length} alerte{alerts.length > 1 ? "s" : ""}</span>}
                  </div>
                  {isOpen ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
                </div>
                <div className="mt-2 grid gap-x-4 gap-y-1.5 text-xs text-ink sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-muted">Unités</span>
                      <strong>
                        {Math.round(units)} / {TARGET_UNITS}
                      </strong>
                    </div>
                    <Bar value={units} max={TARGET_UNITS} color={TONE_COLOR[proj.tone]} />
                    <div className="mt-0.5 text-[11px] text-muted">{proj.date ? `projeté : ${fmtDate(proj.date)}` : proj.tone === "done" ? "atteint" : "pas de rythme"}</div>
                  </div>
                  <div>
                    <span className="text-muted">Modules :</span> <strong>{modulesReussis(c)} / 5</strong>
                    <div className="text-[11px] text-muted">Agrément : {agree ? "obtenu" : AGREMENT_LABEL[c.person.agrement_statut].toLowerCase()}</div>
                  </div>
                  <div>
                    <span className="text-muted">DV semaine :</span> <strong>{Number(r.dv_plan_week)} planifiés · {Number(r.dv_real_week)} réalisés</strong>
                    <div className="text-[11px] text-muted">Recos / DV : {recos === null ? "—" : recos.toFixed(1)}</div>
                  </div>
                  <div>
                    <span className="text-muted">Étapes :</span>{" "}
                    <strong>
                      {validees} validées · {faites} faites{retard > 0 ? <span className="text-red"> · {retard} en retard</span> : ""}
                    </strong>
                  </div>
                </div>
              </button>

              {alerts.length > 0 && (
                <div className="mt-2 flex flex-col gap-0.5">
                  {alerts.map((a, i) => (
                    <div key={i} className={`text-xs ${a.severity === "rouge" ? "font-bold text-red" : "text-[#e08a3a]"}`}>
                      ⚠ {a.text}
                    </div>
                  ))}
                </div>
              )}

              {isOpen && (
                <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 text-xs">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 font-bold text-ink">Modules FSMA</div>
                      {FSMA_MODULES.map((m) => (
                        <div key={m} className="mb-1 flex items-center justify-between gap-2">
                          <span>Module {m}</span>
                          <select
                            value={moduleStatut(c, m)}
                            disabled={pending}
                            onChange={(e) => run(() => setModule(r.person_id, m, e.target.value as ModuleStatut))}
                            className="rounded-md border border-line bg-card-alt px-1.5 py-0.5 text-ink"
                          >
                            {(["a_faire", "en_cours", "reussi"] as ModuleStatut[]).map((s) => (
                              <option key={s} value={s}>
                                {MODULE_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="font-bold text-ink">Examen / dossier d&apos;agrément</span>
                        <select
                          value={c.person.agrement_statut}
                          disabled={pending}
                          onChange={(e) => run(() => setAgrement(r.person_id, e.target.value as AgrementStatut))}
                          className="rounded-md border border-line bg-card-alt px-1.5 py-0.5 text-ink"
                        >
                          {(Object.keys(AGREMENT_LABEL) as AgrementStatut[]).map((s) => (
                            <option key={s} value={s} disabled={s === "obtenu" && !isAdmin}>
                              {AGREMENT_LABEL[s]}
                              {s === "obtenu" && !isAdmin ? " (admin)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-1 text-[11px] text-muted">Statut réglementaire : {agree ? "Agréé FSMA — peut conseiller seul" : "En formation"}</div>
                    </div>

                    <div>
                      <div className="mb-1 font-bold text-ink">Rythme — semaine {week}</div>
                      <label className="mb-1 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!rythmeRow?.point_individuel_at}
                          disabled={pending}
                          onChange={(e) => run(() => setRythme(r.person_id, week, "point_individuel_at", e.target.checked))}
                        />
                        Point individuel de 20 min tenu
                      </label>
                      <label className="mb-1 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!rythmeRow?.victoire_partagee_at}
                          disabled={pending}
                          onChange={(e) => run(() => setRythme(r.person_id, week, "victoire_partagee_at", e.target.checked))}
                        />
                        Victoire partagée au groupe
                      </label>
                      <div className="text-muted">Chiffres du vendredi : {Number(r.figures_days_week) > 0 ? "saisis cette semaine" : "pas encore saisis"}</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-bold text-ink">Étapes du parcours</span>
                      <button
                        disabled={pending || faites === 0}
                        onClick={() =>
                          run(() =>
                            validateSteps(
                              r.person_id,
                              st.filter((s) => s.state === "fait").map((s) => s.etape.id),
                              true
                            )
                          )
                        }
                        className="rounded-md bg-gold px-2.5 py-1 font-bold text-night disabled:opacity-50"
                      >
                        Valider les {faites} étape(s) faites
                      </button>
                    </div>
                    {TRAIL.map((phase) => (
                      <div key={phase} className="mb-1.5">
                        <div className="text-[11px] text-muted">{PHASE_LABEL[phase]}</div>
                        {st
                          .filter((s) => s.etape.phase === phase)
                          .map((s) => {
                            const locked = s.etape.necessite_agrement && !agree;
                            return (
                              <div key={s.etape.id} className="flex items-center justify-between gap-2 py-0.5">
                                <span>
                                  {s.etape.jour_debut !== null && <span className="mr-1 text-muted">J{s.etape.jour_debut}</span>}
                                  {s.etape.titre}
                                  {s.auto && <span className="ml-1 text-muted">({s.auto.label})</span>}
                                </span>
                                <span className="flex flex-shrink-0 items-center gap-2">
                                  <span className="font-bold" style={{ color: STATE_COLOR[s.state] }}>
                                    {STATE_LABEL[s.state]}
                                  </span>
                                  {locked ? (
                                    <span className="flex items-center gap-1 text-muted">
                                      <Lock size={11} /> après agrément
                                    </span>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      title="Valider (mentor)"
                                      checked={s.state === "valide"}
                                      disabled={pending}
                                      onChange={(e) => run(() => validateSteps(r.person_id, [s.etape.id], e.target.checked))}
                                    />
                                  )}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-bold text-ink">
                        Validation finale : {validationOk} / {validation.length}
                      </span>
                      {c.person.autonome_at ? (
                        <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] font-bold text-gold-light">Badge « Autonome » · {fmtDate(c.person.autonome_at)}</span>
                      ) : (
                        <button
                          disabled={pending || validationOk < validation.length}
                          onClick={() => run(() => setAutonome(r.person_id, true))}
                          className="rounded-md border border-line px-2.5 py-1 text-ink disabled:opacity-40"
                        >
                          Décerner le badge « Autonome »
                        </button>
                      )}
                    </div>
                    {validation.map((e) => {
                      const prog = data.progression.find((p) => p.user_id === r.person_id && p.etape_id === e.id) as Progression | undefined;
                      const auto = evalAuto(e.auto_regle, c);
                      const isAuto = ["ft2", "agrement"].includes(e.auto_regle ?? "");
                      const ok = !!prog?.valide_at || (isAuto && auto?.done);
                      const locked = e.necessite_agrement && !agree;
                      return (
                        <label key={e.id} className="flex items-start justify-between gap-2 py-0.5">
                          <span>
                            {e.titre}
                            {auto && <span className="ml-1 text-muted">({auto.label}{!isAuto && auto.done ? " · suggéré" : ""})</span>}
                          </span>
                          {locked && !ok ? (
                            <span className="flex flex-shrink-0 items-center gap-1 text-muted">
                              <Lock size={11} /> après agrément
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={!!ok}
                              disabled={pending || isAuto}
                              onChange={(ev) => run(() => validateSteps(r.person_id, [e.id], ev.target.checked))}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
