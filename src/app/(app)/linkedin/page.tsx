import { notFound } from "next/navigation";
import { isPreFt2Newcomer } from "@/lib/parcours";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { countSentToday, fetchAllContacts } from "@/lib/linkedin/fetch";
import { PipelineBoard } from "./pipeline-board";
import { inboxAddress } from "@/lib/linkedin/inbound";
import type { InboundLogRow } from "./new-relations-panel";
import type { LinkedinTemplate } from "@/lib/linkedin/types";
import type { ChallengeSummary } from "@/lib/linkedin/challenge";
import type { CalendlyLinks } from "@/lib/linkedin/messages";

interface PersonRow {
  id: string;
  name: string;
  reports_to: string | null;
  calendly_url: string | null;
  calendly_links: CalendlyLinks | null;
  slug: string | null;
  linkedin_inbox_code: string | null;
  linkedin_weekly_goal: number | null;
  linkedin_last_import_at: string | null;
}

export default async function LinkedinPage({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const person = await getCurrentPerson();
  if (!person) return null;
  // Le Pipeline et le Défi LinkedIn sont proposés après le passage FT2 / JFA II
  if (isPreFt2Newcomer(person)) notFound();
  const { de } = await searchParams;

  const supabase = await createClient();
  const { data: peopleData } = await supabase.from("people").select("id, name, reports_to, calendly_url, calendly_links, slug, linkedin_inbox_code, linkedin_weekly_goal, linkedin_last_import_at").order("name");
  const people = (peopleData as PersonRow[] | null) ?? [];

  // Qui peut-on consulter ? Soi-même + sa cascade ; l'admin voit tout le monde.
  const viewable = new Set<string>([person.id]);
  if (person.is_admin) {
    people.forEach((p) => viewable.add(p.id));
  } else {
    let frontier = [person.id];
    while (frontier.length > 0) {
      const next = people.filter((p) => p.reports_to && frontier.includes(p.reports_to) && !viewable.has(p.id));
      next.forEach((p) => viewable.add(p.id));
      frontier = next.map((p) => p.id);
    }
  }
  const ownerId = de && viewable.has(de) ? de : person.id;
  const owner = people.find((p) => p.id === ownerId);
  const me = people.find((p) => p.id === person.id);

  // La RLS reste la vraie barrière : même si l'URL est trafiquée, la base ne renvoie rien d'interdit.
  const [contacts, sentToday, { data: templateRows }, { data: summaryRows }, { data: logRows }] = await Promise.all([
    fetchAllContacts(supabase, ownerId),
    countSentToday(supabase, ownerId),
    supabase.from("linkedin_templates").select("*"),
    supabase.rpc("linkedin_challenge_summary"),
    supabase.from("linkedin_inbound_log").select("id, received_at, subject, result, detail").eq("owner_id", ownerId).order("received_at", { ascending: false }).limit(8),
  ]);
  const challenge = ((summaryRows as ChallengeSummary[] | null) ?? [])[0] ?? null;
  // Modèles d'équipe + versions personnelles du propriétaire du pipeline affiché
  const templates = ((templateRows as LinkedinTemplate[] | null) ?? []).filter(
    (t) => t.owner_id === null || t.owner_id === ownerId
  );

  const viewOptions = [
    { id: person.id, name: person.name },
    ...people.filter((p) => p.id !== person.id && viewable.has(p.id)).map((p) => ({ id: p.id, name: p.name })),
  ];

  return (
    <PipelineBoard
      meId={person.id}
      meName={person.name}
      ownerId={ownerId}
      ownerName={owner?.name ?? person.name}
      initialContacts={contacts}
      initialSentToday={sentToday}
      calendlyUrl={me?.calendly_url ?? null}
      calendlyLinks={me?.calendly_links ?? null}
      templates={templates}
      teamNames={people.map((p) => p.name)}
      viewOptions={viewOptions}
      challenge={challenge}
      relations={{
        goal: owner?.linkedin_weekly_goal ?? 10,
        lastImportAt: owner?.linkedin_last_import_at ?? null,
        inbox: owner?.linkedin_inbox_code ? inboxAddress(owner.slug, owner.linkedin_inbox_code, process.env.LINKEDIN_INBOX_DOMAIN ?? "inbox.preparedmindspro.com") : null,
        log: (logRows as InboundLogRow[] | null) ?? [],
      }}
    />
  );
}
