"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarDays, Wallet } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";

export interface CallItem {
  id: string;
  kind: "suivi" | "tache";
  label: string;
  sub: string;
  date: string;
}

export interface StalledSale {
  id: string;
  name: string;
  stage: string;
  daysSinceUpdate: number;
}

export interface ReactivateClient {
  id: string;
  name: string;
  daysSinceContact: number;
}

function Tile({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-3.5">
      <div>
        <div className="text-[11px] text-muted">{label}</div>
        <div className={`font-serif text-2xl font-semibold ${alert && value > 0 ? "text-red" : "text-gold-light"}`}>
          {value}
        </div>
      </div>
      <Icon size={20} className={alert && value > 0 ? "text-red" : "text-muted"} />
    </div>
  );
}

export function PipelineSection({
  today,
  lateCount,
  todayCount,
  upcomingCount,
  reminderCount,
  callPlan,
  stalledSales,
  reactivate,
  reactivateTotal,
}: {
  today: string;
  lateCount: number;
  todayCount: number;
  upcomingCount: number;
  reminderCount: number;
  callPlan: CallItem[];
  stalledSales: StalledSale[];
  reactivate: ReactivateClient[];
  reactivateTotal: number;
}) {
  const supabase = createClient();
  const [toReactivate, setToReactivate] = useState(reactivate);

  const markContacted = async (id: string) => {
    setToReactivate((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("clients").update({ last_contact_at: new Date().toISOString() }).eq("id", id);
  };

  const remaining = Math.max(0, reactivateTotal - (reactivate.length - toReactivate.length));

  return (
    <div className="mb-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Pipeline commercial</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={AlertTriangle} label="Suivis en retard" value={lateCount} alert />
        <Tile icon={CalendarClock} label="À faire aujourd'hui" value={todayCount} />
        <Tile icon={CalendarDays} label="Prévu sous 7 jours" value={upcomingCount} />
        <Tile icon={Wallet} label="Rappels de versement" value={reminderCount} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Mon plan d&apos;appels</div>
            <Link href="/suivis" className="text-xs text-gold-light">
              Ouvrir
            </Link>
          </div>
          {callPlan.length === 0 ? (
            <div className="text-xs text-muted">Rien de planifié dans les 7 prochains jours.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {callPlan.map((c) => (
                <div key={`${c.kind}-${c.id}`} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="truncate text-ink">{c.label}</div>
                    <div className="truncate text-[11px] text-muted">{c.sub}</div>
                  </div>
                  <span className={`flex-shrink-0 font-bold ${c.date < today ? "text-red" : "text-gold-light"}`}>
                    {fmtDate(c.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Dossiers à faire avancer</div>
            <Link href="/prospects" className="text-xs text-gold-light">
              Ouvrir
            </Link>
          </div>
          {stalledSales.length === 0 ? (
            <div className="text-xs text-muted">Aucun dossier en attente depuis plus de 7 jours.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {stalledSales.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="truncate text-ink">{s.name}</div>
                    <div className="truncate text-[11px] text-muted">{s.stage}</div>
                  </div>
                  <span className={`flex-shrink-0 font-bold ${s.daysSinceUpdate >= 14 ? "text-red" : "text-gold-light"}`}>
                    sans MAJ depuis {s.daysSinceUpdate} j
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Clients à réactiver (plus de 3 mois sans contact)
          </div>
          <span className="text-xs font-bold text-gold-light">{remaining}</span>
        </div>
        {toReactivate.length === 0 ? (
          <div className="text-xs text-muted">Tous tes clients ont été contactés ces 3 derniers mois.</div>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {toReactivate.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-ink">{c.name}</span>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="text-muted">{c.daysSinceContact} j</span>
                  <button
                    onClick={() => markContacted(c.id)}
                    className="rounded-md border border-line px-2 py-0.5 text-[11px] text-gold-light"
                  >
                    Contacté
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
