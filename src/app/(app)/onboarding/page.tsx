import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { ctxFor, loadParcours } from "@/lib/parcours-data";
import { parcoursOf, weekOf } from "@/lib/parcours";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { NewcomerDashboard } from "./newcomer-dashboard";
import { MentorCohort, type Story } from "./mentor-cohort";
import { AdminParcours, type MigrationPerson } from "./admin-parcours";

export default async function OnboardingPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const now = brusselsNow();
  const today = toISO(now);
  const jsDay = now.getDay();
  const weekday = jsDay === 0 ? 7 : jsDay;

  const [data, { data: storyRows }, { data: peopleLinks }] = await Promise.all([
    loadParcours(supabase),
    supabase.from("histoires").select("*").order("semaine_prevue"),
    supabase.from("people").select("id, calendly_links"),
  ]);
  const stories = (storyRows as Story[] | null) ?? [];
  const links = new Map(((peopleLinks as { id: string; calendly_links: Record<string, string> | null }[] | null) ?? []).map((p) => [p.id, p.calendly_links ?? {}]));

  const myCtx = ctxFor(data, person.id);
  const others = data.rows.filter((r) => r.person_id !== person.id);
  const isMentorView = others.length > 0;

  const newcomerAlerts = myCtx
    ? [
        ...(myCtx.extras.dvSansRecos > 0 ? [{ ok: false, text: "Un DV réalisé récemment a moins de 5 recommandations encodées : encode-les dans Prospects (source « Recommandation »)." }] : []),
        ...(myCtx.extras.recoNonContactees > 0 ? [{ ok: false, text: `${myCtx.extras.recoNonContactees} recommandation(s) à contacter depuis plus de 48 h.` }] : []),
      ]
    : [];

  // « Histoire de la semaine » : la première non racontée dont la semaine est atteinte par la cohorte
  const maxWeek = others.reduce((m, r) => Math.max(m, weekOf(r.day_n)), 0);
  const story = stories.filter((s) => !s.racontee_le && (s.semaine_prevue ?? 99) <= maxWeek).sort((a, b) => (a.semaine_prevue ?? 99) - (b.semaine_prevue ?? 99))[0] ?? null;

  // Admin : collaborateurs sans parcours (migration depuis l'ancien Fast Start)
  let migration: MigrationPerson[] = [];
  let allEtapes = data.etapes;
  if (person.is_admin) {
    const { data: every } = await supabase.from("parcours_etapes").select("*").order("ordre");
    allEtapes = (every as typeof data.etapes | null) ?? data.etapes;
    const service = createServiceClient() as unknown as SupabaseClient;
    const [{ data: people }, { data: old }] = await Promise.all([
      service.from("people").select("id, name, rank, reports_to").eq("parcours_statut", "non_demarre").eq("active", true).order("name"),
      service.from("onboarding_progress").select("person_id, done_by_self"),
    ]);
    const unitsBy = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data: pols } = await service.from("client_policies").select("units, client:clients(owner_id)").range(from, from + 999);
      for (const p of (pols as unknown as { units: number; client: { owner_id: string } | { owner_id: string }[] | null }[] | null) ?? []) {
        const c = Array.isArray(p.client) ? p.client[0] : p.client;
        if (c) unitsBy.set(c.owner_id, (unitsBy.get(c.owner_id) ?? 0) + (Number(p.units) || 0));
      }
      if (!pols || pols.length < 1000) break;
    }
    const names = new Map(((people as { id: string; name: string }[] | null) ?? []).map((p) => [p.id, p.name]));
    migration = ((people as { id: string; name: string; rank: string; reports_to: string | null }[] | null) ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      rank: p.rank,
      mentor: p.reports_to ? (names.get(p.reports_to) ?? null) : null,
      oldDone: ((old as { person_id: string; done_by_self: boolean }[] | null) ?? []).filter((o) => o.person_id === p.id && o.done_by_self).length,
      oldTotal: ONBOARDING_STEPS.length,
      units: unitsBy.get(p.id) ?? 0,
    }));
    // Les noms « Parrain » : si un parrain n'est pas dans la liste (déjà en parcours), on le retrouve dans l'annuaire
    const missing = migration.filter((m) => m.mentor === null && people?.find((p) => p.id === m.id)?.reports_to);
    if (missing.length > 0) {
      const { data: all } = await service.from("people").select("id, name");
      const byId = new Map(((all as { id: string; name: string }[] | null) ?? []).map((p) => [p.id, p.name]));
      for (const m of missing) m.mentor = byId.get(people!.find((p) => p.id === m.id)!.reports_to!) ?? null;
    }
  }

  // Ancien Fast Start (archivé) de la personne connectée
  const { data: archived } = await supabase.from("onboarding_progress").select("done_by_self").eq("person_id", person.id);
  const archivedDone = (archived ?? []).filter((a) => a.done_by_self).length;

  const mentorOfMe = myCtx?.row.mentor_id ?? null;

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">{myCtx ? "Mon parcours" : "Parcours des nouveaux collaborateurs"}</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        {myCtx
          ? "Ton objectif : 1 000 unités pour passer FT2 / JFA II, en 60 jours maximum, et ton premier agrément FSMA."
          : "1 000 unités en 60 jours et le premier agrément FSMA : le suivi de chaque nouveau en un coup d'œil."}
      </p>

      {myCtx ? (
        <NewcomerDashboard
          ctx={myCtx}
          etapes={data.etapes}
          progression={data.progression.filter((p) => p.user_id === person.id)}
          rythme={data.rythme.filter((r) => r.user_id === person.id)}
          mentorName={myCtx.row.mentor_name}
          evaluationLink={(mentorOfMe && links.get(mentorOfMe)?.evaluation) || null}
          celebrate={data.promoted.includes(person.id)}
          recosToday={newcomerAlerts}
        />
      ) : (
        !isMentorView && (
          <div className="rounded-2xl border border-line bg-card p-5 text-sm text-muted">
            {parcoursOf(person).parcours_statut === "anterieur_termine"
              ? "Ton parcours de démarrage est terminé."
              : "Ton parcours de démarrage n'a pas encore commencé : ton mentor ou l'administrateur le lance avec toi."}
            {archivedDone > 0 && <div className="mt-2 text-xs">Ancien Fast Start (archivé) : {archivedDone} / {ONBOARDING_STEPS.length} étapes faites.</div>}
          </div>
        )
      )}

      {isMentorView && (
        <MentorCohort
          data={{ rows: data.rows, etapes: data.etapes, persons: data.persons, progression: data.progression, modules: data.modules, rythme: data.rythme, extras: data.extras }}
          meId={person.id}
          isAdmin={person.is_admin}
          story={story}
          weekday={weekday}
          hour={now.getHours()}
          myEvaluationLink={links.get(person.id)?.evaluation ?? ""}
        />
      )}

      {person.is_admin && <AdminParcours migration={migration} etapes={allEtapes} stories={stories} today={today} />}
    </div>
  );
}
