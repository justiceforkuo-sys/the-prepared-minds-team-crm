import Link from "next/link";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import type { ChallengeSummary, PodiumRow, TeamOverviewRow, WinRow } from "@/lib/linkedin/challenge";
import { DefiView } from "./defi-view";

export default async function DefiPage() {
  const person = await getCurrentPerson();
  if (!person) return null;
  const supabase = await createClient();

  const [{ data: summaryRows }, { data: podiumRows }, { data: overviewRows }, { data: badgeRows }, { data: winRows }, { data: peopleRows }, { data: goalRows }] =
    await Promise.all([
      supabase.rpc("linkedin_challenge_summary"),
      supabase.rpc("linkedin_podium"),
      supabase.rpc("linkedin_team_overview"),
      supabase.from("linkedin_badges").select("badge").eq("user_id", person.id),
      supabase.from("linkedin_wins").select("id, author_id, body, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("people").select("id, name").neq("id", person.id).order("name"),
      supabase.from("linkedin_team_goal").select("*").order("end_date", { ascending: false }).limit(1),
    ]);

  const summary = ((summaryRows as ChallengeSummary[] | null) ?? [])[0] ?? null;
  const goal = ((goalRows as { id: string; label: string; target: number; start_date: string; end_date: string; reward: string | null }[] | null) ?? [])[0] ?? null;

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">🔥 Défi LinkedIn</h2>
          <p className="mt-1 text-xs text-muted">Un rituel de 20 minutes, une série à tenir, et une équipe qui avance ensemble.</p>
        </div>
        <Link href="/linkedin" className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink">
          ← Pipeline
        </Link>
      </div>
      <DefiView
        meId={person.id}
        meName={person.name}
        isAdmin={person.is_admin}
        summary={summary}
        podium={(podiumRows as PodiumRow[] | null) ?? []}
        overview={(overviewRows as TeamOverviewRow[] | null) ?? []}
        badges={((badgeRows as { badge: string }[] | null) ?? []).map((b) => b.badge)}
        wins={(winRows as WinRow[] | null) ?? []}
        people={(peopleRows as { id: string; name: string }[] | null) ?? []}
        goal={goal}
      />
    </div>
  );
}
