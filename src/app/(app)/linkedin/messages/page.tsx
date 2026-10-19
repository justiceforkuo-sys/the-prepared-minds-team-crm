import Link from "next/link";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import type { LinkedinTemplate, TemplateStat } from "@/lib/linkedin/types";
import type { CalendlyLinks } from "@/lib/linkedin/messages";
import { MessagesEditor } from "./messages-editor";

interface PersonRow {
  id: string;
  name: string;
  calendly_url: string | null;
  calendly_links: CalendlyLinks | null;
}

export default async function MessagesPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const [{ data: templateRows }, { data: statRows }, { data: peopleRows }, { data: badgeRows }] = await Promise.all([
    supabase.from("linkedin_templates").select("*"),
    supabase.rpc("linkedin_template_stats"),
    supabase.from("people").select("id, name, calendly_url, calendly_links"),
    supabase.from("linkedin_badges").select("user_id, badge"),
  ]);

  const templates = (templateRows as LinkedinTemplate[] | null) ?? [];
  const people = (peopleRows as PersonRow[] | null) ?? [];
  const me = people.find((p) => p.id === person.id);
  const names = Object.fromEntries(people.map((p) => [p.id, p.name]));

  const stats: Record<string, TemplateStat> = {};
  for (const r of (statRows as { template_id: string; sent: number | string; replies: number | string }[] | null) ?? []) {
    stats[r.template_id] = { template_id: r.template_id, sent: Number(r.sent), replies: Number(r.replies) };
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">Mes messages</h2>
          <p className="mt-1 text-xs text-muted">
            Écris avec ta propre voix : un message qui sonne comme toi touche plus qu&apos;un message copié.
          </p>
        </div>
        <Link href="/linkedin" className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink">
          Retour au pipeline
        </Link>
      </div>

      <MessagesEditor
        meId={person.id}
        meName={person.name}
        isAdmin={person.is_admin}
        calendlyUrl={me?.calendly_url ?? null}
        calendlyLinks={me?.calendly_links ?? null}
        initialTeam={templates.filter((t) => t.owner_id === null)}
        initialMine={templates.filter((t) => t.owner_id === person.id)}
        others={templates.filter((t) => t.owner_id !== null && t.owner_id !== person.id)}
        names={names}
        stats={stats}
        badges={(badgeRows as { user_id: string; badge: string }[] | null) ?? []}
      />
    </div>
  );
}
