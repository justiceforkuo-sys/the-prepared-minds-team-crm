import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { FORMATION_MODULES } from "@/lib/formation-modules";
import { FormationSlideshow, type ModuleMedia } from "./formation-slideshow";

const SIGNED_TTL = 3 * 3600;

export default async function FormationModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const module_ = FORMATION_MODULES.find((m) => m.id === moduleId);
  if (!module_) notFound();

  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const { data: progress } = await supabase
    .from("formation_progress")
    .select("done")
    .eq("person_id", person.id)
    .eq("module_id", moduleId)
    .maybeSingle();

  // Vidéos et supports : liens temporaires vers le stockage privé (la table peut ne pas encore exister)
  const svc = createServiceClient() as unknown as SupabaseClient;
  const { data: rows } = await svc
    .from("formation_media")
    .select("id, kind, title, path, size_bytes")
    .eq("module_id", moduleId)
    .order("ordre");
  const media: ModuleMedia[] = [];
  for (const r of (rows as { id: string; kind: "video" | "pdf"; title: string; path: string; size_bytes: number | null }[] | null) ?? []) {
    const s = await svc.storage.from("formation-media").createSignedUrl(r.path, SIGNED_TTL);
    if (!s.data) continue;
    media.push({ id: r.id, kind: r.kind, title: r.title, url: s.data.signedUrl, sizeBytes: r.size_bytes });
  }

  return (
    <FormationSlideshow
      personId={person.id}
      person={{ name: person.name, rank: person.rank, phone: person.phone, email: person.email }}
      module={module_}
      initialDone={progress?.done ?? false}
      media={media}
      isAdmin={person.is_admin}
    />
  );
}
