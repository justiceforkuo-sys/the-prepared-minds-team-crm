"use client";

import { useMemo, useState } from "react";
import type { RecruitmentRow } from "@/lib/recruitment";

type Row = RecruitmentRow & { owner: { name: string } | null };

const PERIODS = [
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
  { days: 180, label: "6 mois" },
  { days: 0, label: "Tout" },
] as const;

const INTERVIEWED = ["Entretien planifié", "Retenu", "Intégré", "Actif 90 j"];
const RETAINED = ["Retenu", "Intégré", "Actif 90 j"];
const INTEGRATED = ["Intégré", "Actif 90 j"];

function counts(rows: Row[]) {
  const eligible = rows.filter((c) => c.status !== "Non éligible");
  return {
    applications: eligible.length,
    interviews: eligible.filter((c) => INTERVIEWED.includes(c.status) || c.interview_at !== null).length,
    retained: eligible.filter((c) => RETAINED.includes(c.status)).length,
    integrated: eligible.filter((c) => INTEGRATED.includes(c.status)).length,
    active: eligible.filter((c) => c.status === "Actif 90 j").length,
    notEligible: rows.length - eligible.length,
  };
}

const STEPS: { key: "applications" | "interviews" | "retained" | "integrated" | "active"; label: string }[] = [
  { key: "applications", label: "Candidatures" },
  { key: "interviews", label: "Entretiens" },
  { key: "retained", label: "Retenus" },
  { key: "integrated", label: "Intégrés" },
  { key: "active", label: "Actifs à 90 jours" },
];

export function RecruitmentFunnel({ candidates, isAdmin, nowIso }: { candidates: Row[]; isAdmin: boolean; nowIso: string }) {
  const [days, setDays] = useState<number>(90);
  const [byRecruiter, setByRecruiter] = useState(false);

  const inPeriod = useMemo(() => {
    if (days === 0) return candidates;
    const since = new Date(nowIso).getTime() - days * 86400000;
    return candidates.filter((c) => new Date(c.created_at).getTime() >= since);
  }, [candidates, days, nowIso]);

  const total = counts(inPeriod);
  const max = Math.max(1, total.applications);

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const c of inPeriod) {
      const key = c.owner?.name ?? "Sans responsable";
      m.set(key, [...(m.get(key) ?? []), c]);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [inPeriod]);

  return (
    <div className="mb-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Entonnoir de recrutement</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                days === p.days ? "border-gold bg-line text-gold-light" : "border-line text-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => setByRecruiter((v) => !v)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                byRecruiter ? "border-gold bg-line text-gold-light" : "border-line text-muted"
              }`}
            >
              Par parrain
            </button>
          )}
        </div>
      </div>

      {!byRecruiter ? (
        <div className="flex flex-col gap-1.5">
          {STEPS.map((s, i) => {
            const value = total[s.key];
            const prev = i === 0 ? null : total[STEPS[i - 1].key];
            const rate = prev === null ? null : prev === 0 ? null : Math.round((value / prev) * 100);
            return (
              <div key={s.key} className="flex items-center gap-2.5 text-xs">
                <div className="w-32 flex-shrink-0 text-ink">{s.label}</div>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-line">
                  <div
                    className="h-full rounded-md"
                    style={{ width: `${Math.max(value > 0 ? 3 : 0, Math.round((value / max) * 100))}%`, background: "linear-gradient(90deg,#f5cd54,#1f8158)" }}
                  />
                </div>
                <div className="w-8 flex-shrink-0 text-right font-bold text-ink">{value}</div>
                <div className="w-12 flex-shrink-0 text-right text-[11px] text-muted">{rate === null ? "" : `${rate} %`}</div>
              </div>
            );
          })}
          <div className="mt-1 text-[11px] text-muted">
            Taux de passage = étape ÷ étape précédente.
            {total.notEligible > 0 ? ` ${total.notEligible} candidature${total.notEligible > 1 ? "s" : ""} non éligible${total.notEligible > 1 ? "s" : ""} non comptée${total.notEligible > 1 ? "s" : ""}.` : ""}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-normal">Parrain</th>
                {STEPS.map((s) => (
                  <th key={s.key} className="py-1 pr-3 font-normal">
                    {s.label.replace(" à 90 jours", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(([name, rows]) => {
                const c = counts(rows);
                return (
                  <tr key={name} className="border-t border-line">
                    <td className="py-1.5 pr-3 font-bold">{name}</td>
                    <td className="py-1.5 pr-3">{c.applications}</td>
                    <td className="py-1.5 pr-3">{c.interviews}</td>
                    <td className="py-1.5 pr-3">{c.retained}</td>
                    <td className="py-1.5 pr-3">{c.integrated}</td>
                    <td className="py-1.5 pr-3">{c.active}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
