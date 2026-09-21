"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Calculator } from "lucide-react";

function parseRatio(input: string, fallback: number): number {
  const n = parseFloat(input.replace(",", "."));
  return n > 0 ? n : fallback;
}

export function EngagementCalculator() {
  const [open, setOpen] = useState(false);
  const [targetUnits, setTargetUnits] = useState("300");
  const [avgUnitsPerClient, setAvgUnitsPerClient] = useState("100");
  const [rdvToRealise, setRdvToRealise] = useState("2");
  const [realiseToSigne, setRealiseToSigne] = useState("3");
  const [weeks, setWeeks] = useState("12");

  const target = parseRatio(targetUnits, 0);
  const avgUnits = parseRatio(avgUnitsPerClient, 100);
  const ratio1 = parseRatio(rdvToRealise, 2);
  const ratio2 = parseRatio(realiseToSigne, 3);
  const nbWeeks = parseRatio(weeks, 1);

  const clientsNeeded = target / avgUnits;
  const rdvRealisesNeeded = clientsNeeded * ratio2;
  const rdvPlanifiesNeeded = rdvRealisesNeeded * ratio1;
  const rdvPerWeek = rdvPlanifiesNeeded / nbWeeks;

  return (
    <div className="mb-4 rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-gold-light" />
          <span className="text-sm font-bold text-ink">Calculateur d&apos;engagement</span>
        </div>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
          <p className="text-xs text-muted">
            Combien de rendez-vous par semaine faut-il viser pour atteindre un objectif d&apos;unités, sur base de
            tes ratios de conversion ?
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Objectif d'unités" value={targetUnits} onChange={setTargetUnits} />
            <Field label="Unités moyennes / client" value={avgUnitsPerClient} onChange={setAvgUnitsPerClient} />
            <Field label="RDV planifiés pour 1 réalisé" value={rdvToRealise} onChange={setRdvToRealise} />
            <Field label="RDV réalisés pour 1 signé" value={realiseToSigne} onChange={setRealiseToSigne} />
            <Field label="Semaines restantes" value={weeks} onChange={setWeeks} />
          </div>

          <div className="rounded-lg border border-gold bg-line p-3 text-center">
            <div className="font-serif text-2xl font-semibold text-gold-light">
              {Number.isFinite(rdvPerWeek) ? Math.ceil(rdvPerWeek) : "—"}
            </div>
            <div className="text-xs text-muted">rendez-vous / semaine</div>
          </div>

          <div className="text-[11px] text-muted">
            ≈ {clientsNeeded > 0 ? Math.ceil(clientsNeeded) : 0} client(s) à signer, soit{" "}
            {rdvRealisesNeeded > 0 ? Math.ceil(rdvRealisesNeeded) : 0} RDV réalisés et{" "}
            {rdvPlanifiesNeeded > 0 ? Math.ceil(rdvPlanifiesNeeded) : 0} RDV planifiés au total.
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
      />
    </div>
  );
}
