import { Lock } from "lucide-react";
import { createServiceClient } from "@/utils/supabase/service";
import { PostulerForm } from "../postuler-form";

export default async function PostulerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: recruiter } = await supabase
    .from("people")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!recruiter) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Lock size={22} className="mx-auto mb-2 text-gold" />
          <h1 className="font-serif text-xl font-semibold text-ink">Lien invalide</h1>
          <p className="mt-2 text-sm text-muted">
            Ce lien de candidature n&apos;existe pas ou n&apos;est plus actif.
          </p>
        </div>
      </div>
    );
  }

  return <PostulerForm slug={slug} recruiterName={recruiter.name} />;
}
