"use server";

import { createServiceClient } from "@/utils/supabase/service";

export type SubmitState = { error?: string; success?: boolean } | undefined;

export async function submitApplication(
  slug: string,
  _prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const supabase = createServiceClient();

  const { data: recruiter } = await supabase
    .from("people")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!recruiter) return { error: "Lien invalide." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Le nom est obligatoire." };

  const birthdate = String(formData.get("birthdate") || "").trim();

  const { error } = await supabase.from("recruitment_applications").insert({
    recruiter_id: recruiter.id,
    name,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    nationality: String(formData.get("nationality") || "").trim() || null,
    current_situation: String(formData.get("current_situation") || "").trim() || null,
    birthdate: birthdate || null,
    has_cess: formData.get("has_cess") === "on",
    availability_confirmed: formData.get("availability_confirmed") === "on",
    french_level: String(formData.get("french_level") || "").trim() || null,
    english_level: String(formData.get("english_level") || "").trim() || null,
    referral_source: String(formData.get("referral_source") || "").trim() || null,
  });

  if (error) return { error: "Une erreur est survenue. Réessaie." };
  return { success: true };
}
