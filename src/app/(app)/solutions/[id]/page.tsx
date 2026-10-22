import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { SolutionView } from "./solution-view";
import { SolutionEditor } from "./solution-editor";
import type { Solution, SolutionDocument } from "@/lib/solutions";

export default async function SolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getCurrentPerson();
  if (!person) return null;
  const canEdit = person.is_admin || (person as { peut_editer_solutions?: boolean }).peut_editer_solutions === true;

  const supabase = await createClient();
  const { data } = await supabase.from("solutions").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const solution = data as Solution;

  const { data: docRows } = await supabase.from("solution_documents").select("*").eq("solution_id", id).order("depose_le", { ascending: false });
  const docs = (docRows as SolutionDocument[] | null) ?? [];

  // Lecture des PDF par lien signé temporaire (le dossier de stockage reste privé)
  const service = createServiceClient() as unknown as SupabaseClient;
  const links: Record<string, string> = {};
  for (const d of docs) {
    const { data: signed } = await service.storage.from("solutions-docs").createSignedUrl(d.fichier_path, 3600);
    if (signed?.signedUrl) links[d.id] = signed.signedUrl;
  }

  let verifierName: string | null = null;
  if (solution.verifiee_par) {
    const { data: v } = await supabase.from("people").select("name").eq("id", solution.verifiee_par).maybeSingle();
    verifierName = (v as { name: string } | null)?.name ?? null;
  }

  return (
    <div>
      <Link href="/solutions" className="mb-3 inline-flex items-center gap-1 text-xs text-muted">
        <ArrowLeft size={14} /> Toutes les solutions
      </Link>
      <SolutionView solution={solution} docs={docs} links={links} verifierName={verifierName} />
      {canEdit && <SolutionEditor solution={solution} docs={docs} meId={person.id} />}
    </div>
  );
}
