"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import type { ChallengeSummary } from "@/lib/linkedin/challenge";

export const CHALLENGE_EVENT = "linkedin:changed";

// Bandeau 🔥 en tête du pipeline : série, points de la semaine, compteur d'équipe.
export function ChallengeStrip({ initial }: { initial: ChallengeSummary | null }) {
  const [s, setS] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.rpc("linkedin_challenge_summary");
      const row = (data as ChallengeSummary[] | null)?.[0];
      if (row) setS(row);
    };
    window.addEventListener(CHALLENGE_EVENT, refresh);
    return () => window.removeEventListener(CHALLENGE_EVENT, refresh);
  }, []);

  if (!s) return null;

  if (!s.joined || !s.active) {
    return (
      <Link
        href="/linkedin/defi"
        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-card px-3.5 py-2.5 text-xs"
      >
        <span className="text-ink">
          🔥 <strong>Défi LinkedIn</strong> — une série, des points, un rituel de 20 minutes chaque matin.
        </span>
        <span className="font-bold text-gold-light">Rejoindre →</span>
      </Link>
    );
  }

  const goal = s.goal_target ? `Équipe ${s.team_rdv} / ${s.goal_target} RDV` : null;
  return (
    <Link
      href="/linkedin/defi"
      className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-3.5 py-2.5 text-xs"
      style={{ background: "rgba(245,205,84,0.12)", borderColor: "rgba(245,205,84,0.4)" }}
    >
      <span className="font-bold text-ink">
        🔥 {s.streak} jour{s.streak > 1 ? "s" : ""} d&apos;affilée
      </span>
      <span className="text-ink">
        {s.points_week} point{s.points_week > 1 ? "s" : ""} cette semaine
      </span>
      {goal && <span className="text-ink">{goal}</span>}
      <span className="ml-auto font-bold text-gold-light">Voir le Défi →</span>
    </Link>
  );
}
