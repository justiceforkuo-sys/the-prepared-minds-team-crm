"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

// Présence : un seul « pilote » (PresenceTracker) envoie un signal toutes les 30 s tant que l'onglet est visible,
// et marque le temps comme actif si la personne a bougé, cliqué, tapé ou défilé dans les 2 dernières minutes.
// La liste des personnes en ligne est partagée avec les affichages (OnlineList) par un petit magasin local.

type Online = { id: string; name: string };

const EMPTY: Online[] = [];
let online: Online[] = EMPTY;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const setOnline = (v: Online[]) => {
  online = v;
  listeners.forEach((l) => l());
};

const HEARTBEAT_MS = 30_000;
const IDLE_MS = 120_000;
const INTERACTIONS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

/** `paused` : pas de comptage quand un administrateur agit en tant que quelqu'un d'autre (le temps ne lui appartiendrait pas). */
export function PresenceTracker({ paused = false }: { paused?: boolean }) {
  useEffect(() => {
    if (paused) return;
    let lastInteraction = Date.now();
    const touch = () => {
      lastInteraction = Date.now();
    };
    INTERACTIONS.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const ping = async () => {
      if (document.visibilityState !== "visible") return;
      const active = Date.now() - lastInteraction < IDLE_MS;
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active }),
          keepalive: true,
        });
        if (res.ok) setOnline(((await res.json()) as { online: Online[] }).online);
      } catch {
        // réseau coupé : on réessaie au prochain signal
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    void ping();
    const timer = window.setInterval(() => void ping(), HEARTBEAT_MS);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      INTERACTIONS.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [paused]);
  return null;
}

export function useOnline(): Online[] {
  return useSyncExternalStore(subscribe, () => online, () => EMPTY);
}

/** Liste des personnes en ligne (barre latérale ou page « Activité »). */
export function OnlineList({ meId, className = "" }: { meId: string; className?: string }) {
  const list = useOnline();
  const others = list.filter((p) => p.id !== meId);
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3ecf8e]" />
        En ligne ({list.length || 1})
      </div>
      <ul className="flex flex-col gap-0.5 text-xs text-ink">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-[#3ecf8e]" />
          <span className="truncate">Toi</span>
        </li>
        {others.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-[#3ecf8e]" />
            <span className="truncate">{p.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pastille compacte pour l'en-tête mobile : nombre de personnes en ligne ; le détail est dans le titre. */
export function OnlinePill({ meId }: { meId: string }) {
  const list = useOnline();
  const names = list.filter((p) => p.id !== meId).map((p) => p.name);
  const count = Math.max(1, list.length);
  return (
    <Link
      href="/activite"
      title={names.length ? `En ligne : ${names.join(", ")}` : "Toi seul(e) en ligne"}
      className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1.5 text-xs font-bold text-ink"
    >
      <span className="inline-block h-2 w-2 rounded-full bg-[#3ecf8e]" />
      {count}
    </Link>
  );
}
