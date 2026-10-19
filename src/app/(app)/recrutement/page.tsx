import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { brusselsNow, toISO } from "@/lib/pilotage";
import { RecrutementBoard } from "./recrutement-board";
import type { CandidateRowData } from "./candidate-card";

export default async function RecrutementPage() {
  const person = await getCurrentPerson();
  if (!person) return null;
  if (person.status === "essai") notFound();

  const supabase = await createClient();
  const [{ data: candidates }, { data: peopleRows }] = await Promise.all([
    supabase
      .from("recruitment_applications")
      .select(
        "*, recruiter:people!recruitment_applications_recruiter_id_fkey(name), owner:people!recruitment_applications_owner_id_fkey(name)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("people").select("id, name, calendly_links").order("name"),
  ]);

  const people = (peopleRows as { id: string; name: string; calendly_links: Record<string, string> | null }[] | null) ?? [];
  const interviewLinks: Record<string, string> = {};
  for (const p of people) if (p.calendly_links?.entretien) interviewLinks[p.id] = p.calendly_links.entretien;
  const myLinks = people.find((p) => p.id === person.id)?.calendly_links ?? {};

  return (
    <RecrutementBoard
      isAdmin={person.is_admin}
      meId={person.id}
      initialCandidates={(candidates as CandidateRowData[] | null) ?? []}
      people={people.map((p) => ({ id: p.id, name: p.name }))}
      mySlug={person.slug}
      myLinks={myLinks}
      interviewLinks={interviewLinks}
      nowIso={new Date().toISOString()}
      today={toISO(brusselsNow())}
    />
  );
}
