"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { computeSprintCounts, sprintOverallProgress } from "@/lib/linkedin-sprint";
import type { Goal, LinkedinSprint, Prospect } from "@/types/database";

interface PersonLite {
  id: string;
  name: string;
}

function MiniBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="font-bold text-ink">
          {current} / {target}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-card-alt">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TeamTrackingPanel({
  people,
  sprints,
  prospects,
  goals,
}: {
  people: PersonLite[];
  sprints: LinkedinSprint[];
  prospects: Prospect[];
  goals: Goal[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const rows = people.map((p) => {
    const personSprints = sprints
      .filter((s) => s.person_id === p.id)
      .sort((a, b) => (a.date_debut < b.date_debut ? 1 : -1));
    const sprint = personSprints[0] ?? null;
    const personProspects = prospects.filter((pr) => pr.owner_id === p.id);
    const counts = sprint ? computeSprintCounts(sprint, personProspects) : null;
    const overallPct = sprint && counts ? sprintOverallProgress(sprint, counts) : null;
    const sprintExpired = sprint ? sprint.date_fin < today : false;

    const personGoals = goals.filter((g) => g.person_id === p.id);
    const goalsDone = personGoals.filter((g) => g.done).length;

    return { person: p, sprint, counts, overallPct, sprintExpired, personGoals, goalsDone };
  });

  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Suivi équipe — Sprint LinkedIn &amp; Objectifs</div>
      <div className="flex flex-col gap-2">
        {rows.map(({ person, sprint, counts, overallPct, sprintExpired, personGoals, goalsDone }) => {
          const isOpen = openId === person.id;
          const sprintLabel = !sprint
            ? "Aucun sprint actif"
            : sprintExpired
              ? `Sprint terminé (${fmtDate(sprint.date_fin)})`
              : `Sprint : ${overallPct}% · jusqu'au ${fmtDate(sprint.date_fin)}`;

          return (
            <div key={person.id} className="rounded-2xl border border-line bg-card p-3.5">
              <button
                onClick={() => setOpenId(isOpen ? null : person.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <div className="text-sm font-bold text-ink">{person.name}</div>
                  <div className="text-xs text-muted">
                    {sprintLabel}
                    {" · "}
                    Objectifs : {goalsDone}/{personGoals.length} atteints
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
              </button>

              {isOpen && (
                <div className="mt-2.5 flex flex-col gap-3 border-t border-line pt-2.5">
                  {sprint && counts ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Recrutement</div>
                        <MiniBar label="Contacts" current={counts.recrutement.contacts} target={sprint.cible_contacts_recrutement} />
                        <MiniBar label="Échanges qualifiés" current={counts.recrutement.echanges} target={sprint.cible_echanges_recrutement} />
                        <MiniBar label="Entretiens" current={counts.recrutement.rdv} target={sprint.cible_entretiens_recrutement} />
                        <MiniBar label="JFA intégrés" current={counts.recrutement.dossiers} target={sprint.cible_jfa_recrutement} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Client</div>
                        <MiniBar label="Contacts" current={counts.client.contacts} target={sprint.cible_contacts_client} />
                        <MiniBar label="Échanges qualifiés" current={counts.client.echanges} target={sprint.cible_echanges_client} />
                        <MiniBar label="RDV pris" current={counts.client.rdv} target={sprint.cible_rdv_client} />
                        <MiniBar label="Dossiers ouverts" current={counts.client.dossiers} target={sprint.cible_dossiers_client} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Prescripteur</div>
                        <MiniBar label="Contacts" current={counts.prescripteur.contacts} target={sprint.cible_contacts_prescripteur} />
                        <MiniBar label="Échanges qualifiés" current={counts.prescripteur.echanges} target={sprint.cible_echanges_prescripteur} />
                        <MiniBar
                          label="Mises en relation"
                          current={counts.prescripteur.misesEnRelation}
                          target={sprint.cible_mises_en_relation_prescripteur}
                        />
                        <MiniBar label="Leads générés" current={counts.prescripteur.leads} target={sprint.cible_leads_prescripteur} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Aucun sprint lancé pour l&apos;instant.</p>
                  )}

                  {personGoals.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Objectifs</div>
                      {personGoals.map((g) => {
                        const stepsDone = g.steps.filter((s) => s.done).length;
                        return (
                          <div key={g.id} className="flex items-center gap-1.5 text-xs">
                            {g.done ? (
                              <CheckCircle2 size={13} className="flex-shrink-0 text-green" />
                            ) : (
                              <Circle size={13} className="flex-shrink-0 text-muted" />
                            )}
                            <span className={g.done ? "text-ink line-through" : "text-ink"}>{g.text}</span>
                            {g.steps.length > 0 && (
                              <span className="text-muted">
                                ({stepsDone}/{g.steps.length})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
