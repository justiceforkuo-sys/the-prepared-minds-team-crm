"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

const BATCH_SIZE = 10;

export function GeocodeBackfillPanel({ initialCount }: { initialCount: number }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [remaining, setRemaining] = useState(initialCount);
  const [finished, setFinished] = useState(false);

  const run = async () => {
    setRunning(true);
    setDone(0);
    setFailed(0);
    setFinished(false);

    const maxBatches = Math.ceil(initialCount / BATCH_SIZE) || 1;
    let okCount = 0;
    let koCount = 0;

    for (let i = 0; i < maxBatches; i++) {
      const res = await fetch("/api/admin/geocode-clients", { method: "POST" });
      const data = await res.json();
      if (!res.ok) break;
      okCount += data.succeeded;
      koCount += data.failed;
      setDone(okCount);
      setFailed(koCount);
      setRemaining(data.remaining);
      if (data.succeeded + data.failed === 0) break; // rien à traiter, on arrête
    }

    setFinished(true);
    setRunning(false);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        <MapPin size={13} /> Géocodage des clients
      </div>
      <p className="mb-2.5 text-xs text-muted">
        {initialCount > 0
          ? `${initialCount} client(s) avec adresse mais pas encore sur la carte.`
          : "Tous les clients avec adresse sont géocodés."}
      </p>
      {initialCount > 0 && !finished && (
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-night disabled:opacity-50"
        >
          {running ? `Géocodage en cours... (${done + failed}/${initialCount})` : "Géocoder les clients existants"}
        </button>
      )}
      {finished && (
        <div className="text-xs text-muted">
          {done} géocodé(s), {failed} échec(s) (adresse non reconnue — {remaining} reste(nt) à corriger
          manuellement).
        </div>
      )}
    </div>
  );
}
