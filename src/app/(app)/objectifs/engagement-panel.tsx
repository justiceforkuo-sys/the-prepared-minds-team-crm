"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { monthProgress, projectEndOfMonth, statProjection } from "@/lib/pilotage";
import { ProgressBar as Progress, StatBox as Stat } from "@/components/stat-bits";

interface MonthTotals {
  units: number;
  dvRealises: number;
  drRealises: number;
  dossiers: number;
}

export function EngagementPanel({
  personId,
  month,
  initialUnites,
  initialRecrues,
  totals,
}: {
  personId: string;
  month: string;
  initialUnites: number;
  initialRecrues: number;
  totals: MonthTotals;
}) {
  const supabase = createClient();
  const [unites, setUnites] = useState(String(initialUnites || ""));
  const [recrues, setRecrues] = useState(String(initialRecrues || ""));
  const [savedUnites, setSavedUnites] = useState(initialUnites);
  const [savedRecrues, setSavedRecrues] = useState(initialRecrues);
  const [editing, setEditing] = useState(initialUnites === 0 && initialRecrues === 0);

  const progress = monthProgress(new Date());
  const monthLabel = new Date(`${month}-01`).toLocaleDateString("fr-BE", { month: "long", year: "numeric" });

  const save = async () => {
    const u = Math.max(0, parseFloat(unites.replace(",", ".")) || 0);
    const r = Math.max(0, parseInt(recrues, 10) || 0);
    const { error } = await supabase
      .from("monthly_engagements")
      .upsert({ person_id: personId, month, objectif_unites: u, objectif_recrues: r }, { onConflict: "person_id,month" });
    if (error) return;
    setSavedUnites(u);
    setSavedRecrues(r);
    setEditing(false);
  };

  const pctUnits = savedUnites > 0 ? (totals.units / savedUnites) * 100 : 0;
  const pctRecrues = savedRecrues > 0 ? (totals.dossiers / savedRecrues) * 100 : 0;
  const projUnits = projectEndOfMonth(totals.units, progress);
  const projPct = savedUnites > 0 ? (projUnits / savedUnites) * 100 : 0;
  const proj = statProjection(savedUnites - totals.units, savedRecrues - totals.dossiers, progress.weeksLeft);
  const fmt = (n: number) => (Number.isFinite(n) ? Math.ceil(n).toString() : "—");
  const fmt1 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "—");

  return (
    <div className="mb-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Mon engagement</div>
          <div className="text-[11px] capitalize text-muted">{monthLabel}</div>
        </div>
        <button onClick={() => setEditing((e) => !e)} className="text-xs text-gold-light">
          {editing ? "Annuler" : "Modifier"}
        </button>
      </div>

      {editing && (
        <div className="mb-3 grid grid-cols-2 gap-2.5 rounded-xl border border-line bg-card-alt p-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-muted">Objectif d&apos;unités du mois</label>
            <input
              value={unites}
              onChange={(e) => setUnites(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-muted">Objectif de dossiers recrutement</label>
            <input
              value={recrues}
              onChange={(e) => setRecrues(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
          </div>
          <button onClick={save} className="col-span-2 rounded-lg bg-gold py-1.5 text-xs font-bold text-night">
            Enregistrer mon engagement
          </button>
        </div>
      )}

      {savedUnites === 0 && savedRecrues === 0 ? (
        <p className="text-xs text-muted">Fixe ton objectif du mois pour suivre ta progression et ta projection.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 flex items-end justify-between">
              <div className="text-xs text-muted">
                Unités : <strong className="text-ink">{totals.units.toFixed(1)}</strong> / {savedUnites}
              </div>
              <div className="text-xs font-bold text-gold-light">{Math.round(pctUnits)}% atteint</div>
            </div>
            <Progress pct={pctUnits} />
            <div className="mt-1 text-[11px] text-muted">
              Projection fin de mois (rythme actuel) : <strong className="text-ink">{projUnits.toFixed(1)}</strong> (
              {Math.round(projPct)}%)
            </div>
          </div>

          {savedRecrues > 0 && (
            <div>
              <div className="mb-1 flex items-end justify-between">
                <div className="text-xs text-muted">
                  Dossiers recrutement : <strong className="text-ink">{totals.dossiers}</strong> / {savedRecrues}
                </div>
                <div className="text-xs font-bold text-gold-light">{Math.round(pctRecrues)}% atteint</div>
              </div>
              <Progress pct={pctRecrues} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="DV réalisés" value={String(totals.dvRealises)} />
            <Stat label="DR réalisés" value={String(totals.drRealises)} />
            <Stat label="Unités" value={totals.units.toFixed(1)} />
            <Stat label="Dossiers" value={String(totals.dossiers)} />
          </div>

          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
              Projection statistique — {progress.weeksLeft} semaine{progress.weeksLeft > 1 ? "s" : ""} restante
              {progress.weeksLeft > 1 ? "s" : ""}
            </div>
            <div className="mb-2 text-[11px] text-muted">
              Ratios OVB : 1 DV réalisé sur 2 planifiés, 1 signature sur 3 DV réalisés, 100 u par client, 1 dossier pour
              25 DR planifiés.
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="DV planifiés" value={fmt(proj.dvPlanifies)} sub={`soit ${fmt1(proj.perWeek.dvPlanifies)} / sem.`} />
              <Stat label="DV réalisés" value={fmt(proj.dvRealises)} sub={`soit ${fmt1(proj.perWeek.dvRealises)} / sem.`} />
              <Stat label="Unités à produire" value={fmt(Math.max(0, savedUnites - totals.units))} sub={`soit ${fmt1(proj.perWeek.units)} / sem.`} />
              <Stat label="Clients à signer" value={fmt(proj.clientsToSign)} sub={`soit ${fmt1(proj.perWeek.clients)} / sem.`} />
              {savedRecrues > 0 && (
                <>
                  <Stat label="DR planifiés" value={fmt(proj.drPlanifies)} sub={`soit ${fmt1(proj.perWeek.drPlanifies)} / sem.`} />
                  <Stat label="Recrues à entrer" value={fmt(Math.max(0, savedRecrues - totals.dossiers))} sub={`soit ${fmt1(proj.perWeek.recrues)} / sem.`} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
