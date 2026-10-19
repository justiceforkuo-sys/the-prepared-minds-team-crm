"use server";

import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { generateUniqueSlugFor } from "@/lib/slug";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";
import { sendCollaboratorInvitation } from "@/lib/email/send-recruitment";
import type { RecruitmentRow } from "@/lib/recruitment";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-prepared-minds-team-crm.vercel.app";

export type OnboardingResult = { ok: true; message: string; personId: string } | { ok: false; error: string };

/**
 * « Retenu → lancer l'onboarding » : crée la fiche du collaborateur (rattachée à son parrain, en période
 * d'essai), prépare ses 9 étapes de Fast Start, envoie le lien d'activation, passe la candidature à « Intégré ».
 * `linkToPersonId` rattache simplement la candidature à une fiche déjà existante (aucune invitation).
 */
export async function launchOnboarding(applicationId: string, linkToPersonId?: string): Promise<OnboardingResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };

  // La lecture passe par la RLS : on ne peut agir que sur une candidature dont on est responsable (ou admin)
  const supabase = await createClient();
  const { data } = await supabase.from("recruitment_applications").select("*").eq("id", applicationId).maybeSingle();
  const app = data as RecruitmentRow | null;
  if (!app) return { ok: false, error: "Candidature introuvable." };
  if (app.person_id) return { ok: false, error: "Cette candidature est déjà liée à une fiche collaborateur." };

  const service = createServiceClient();
  const sponsorId = app.owner_id ?? app.recruiter_id ?? me.id;

  let personId: string;
  let note = "";

  if (linkToPersonId) {
    const { data: existing } = await service.from("people").select("id").eq("id", linkToPersonId).maybeSingle();
    if (!existing) return { ok: false, error: "Fiche collaborateur introuvable." };
    personId = existing.id;
    note = "Candidature rattachée à la fiche existante.";
  } else {
    if (!app.email) return { ok: false, error: "Ajoute d'abord l'email du candidat : il sert à envoyer l'invitation." };
    const { data: sameEmail } = await service.from("people").select("id").ilike("email", app.email).maybeSingle();
    if (sameEmail) {
      personId = sameEmail.id;
      note = "Une fiche existe déjà avec cet email : candidature rattachée, aucune invitation envoyée.";
    } else {
      const slug = await generateUniqueSlugFor(service, app.name);
      const { data: person, error } = await service
        .from("people")
        .insert({
          name: app.name,
          email: app.email,
          phone: app.phone,
          rank: "JFAI",
          reports_to: sponsorId,
          slug,
          status: "essai",
        })
        .select("id")
        .single();
      if (error || !person) return { ok: false, error: `Création de la fiche impossible : ${error?.message ?? "erreur inconnue"}` };
      personId = person.id;

      // Compte de connexion + lien d'activation (la fiche est rattachée au compte par email à la création)
      const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "invite", email: app.email });
      if (linkError || !link.properties?.action_link) {
        note = `Fiche créée, mais le lien d'activation n'a pas pu être généré (${linkError?.message ?? "erreur"}).`;
      } else {
        const { data: sponsor } = await service.from("people").select("name").eq("id", sponsorId).maybeSingle();
        try {
          const res = await sendCollaboratorInvitation({
            to: app.email,
            name: app.name,
            sponsorName: sponsor?.name ?? me.name,
            activationUrl: `${SITE_URL}/activer?to=${encodeURIComponent(link.properties.action_link)}`,
          });
          note = res.error ? `Fiche créée, mais l'email d'invitation n'est pas parti : ${res.error.message}` : `Invitation envoyée à ${app.email}.`;
        } catch (err) {
          note = `Fiche créée, mais l'email d'invitation n'est pas parti : ${err instanceof Error ? err.message : "erreur"}`;
        }
      }
    }
  }

  // Fast Start : les 9 étapes existent dès le départ (0/9), pour que le parrain suive la progression
  await service.from("onboarding_progress").upsert(
    ONBOARDING_STEPS.map((s) => ({ person_id: personId, step_id: s.id, done_by_self: false })),
    { onConflict: "person_id,step_id", ignoreDuplicates: true }
  );

  const { error: updateError } = await service
    .from("recruitment_applications")
    .update({ status: "Intégré", person_id: personId, next_action: null, next_action_date: null })
    .eq("id", app.id);
  if (updateError) return { ok: false, error: `Candidature non mise à jour : ${updateError.message}` };

  return { ok: true, personId, message: `Onboarding lancé. ${note}`.trim() };
}
