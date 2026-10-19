"use server";

import { createServiceClient } from "@/utils/supabase/service";
import {
  ELIGIBILITY_OPTIONS,
  HOURS_OPTIONS,
  INCOME_OPTIONS,
  LEVEL_OPTIONS,
  MIN_AGE,
  NOT_ELIGIBLE_MESSAGE,
  REFERRAL_OPTIONS,
  SITUATION_OPTIONS,
  TOO_YOUNG_MESSAGE,
  ageOn,
  computeScore,
  type ScoreLabel,
} from "@/lib/recruitment";
import { sendCandidateConfirmation, sendRecruiterNotification } from "@/lib/email/send-recruitment";
import { displayName } from "@/lib/linkedin/messages";

export type SubmitResult =
  | { kind: "ok"; firstName: string; recruiterName: string; interviewUrl: string | null }
  | { kind: "too_young" | "not_eligible"; firstName: string; message: string };

export type SubmitState =
  | { error?: string; values?: Record<string, string>; result?: SubmitResult }
  | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const oneOf = <T extends string>(value: string, allowed: readonly T[]): T | null => ((allowed as readonly string[]).includes(value) ? (value as T) : null);
const yesNo = (v: string): boolean | null => (v === "oui" ? true : v === "non" ? false : null);

function firstNameOf(name: string): string {
  const n = name.includes(",") ? name.split(",")[1] : name;
  return n.trim().split(/\s+/)[0] ?? name;
}

/** Lien « Entretien de Recrutement » du responsable, avec nom et email du candidat préremplis. */
function interviewUrlFor(base: string | undefined, name: string, email: string): string | null {
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("name", name);
    url.searchParams.set("email", email);
    url.searchParams.set("hide_gdpr_banner", "1");
    return url.toString();
  } catch {
    return null;
  }
}

export async function submitApplication(slug: string, _prev: SubmitState, formData: FormData): Promise<SubmitState> {
  // Champ piège pour les robots : un humain ne le voit pas
  if (str(formData, "website")) return { result: { kind: "ok", firstName: "", recruiterName: "", interviewUrl: null } };

  const values: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && k !== "website") values[k] = v;
  });

  const supabase = createServiceClient();
  const { data: recruiter } = await supabase
    .from("people")
    .select("id, name, email, calendly_links")
    .eq("slug", slug)
    .maybeSingle();
  if (!recruiter) return { error: "Ce lien n'est plus valide.", values };

  const name = str(formData, "name");
  const email = str(formData, "email");
  const phone = str(formData, "phone");
  const birthdate = str(formData, "birthdate");
  const eligibility = oneOf(str(formData, "eligibility"), ELIGIBILITY_OPTIONS.map((o) => o.value));
  const motivation = str(formData, "motivation");

  if (!name) return { error: "Le nom est obligatoire.", values };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Indique une adresse email valide : on t'y envoie la confirmation.", values };
  if (!phone) return { error: "Le téléphone est obligatoire.", values };
  if (!birthdate || Number.isNaN(Date.parse(birthdate))) return { error: "Indique ta date de naissance.", values };
  if (!eligibility) return { error: "Choisis la situation qui te correspond (éligibilité).", values };
  if (!motivation) return { error: "Dis-nous en quelques mots pourquoi cette opportunité t'intéresse.", values };
  if (formData.get("consent") !== "on") return { error: "Le consentement est nécessaire pour étudier ta candidature.", values };

  const age = ageOn(birthdate);
  const eligibleByRule = ELIGIBILITY_OPTIONS.find((o) => o.value === eligibility)?.eligible ?? false;
  const tooYoung = age < MIN_AGE; // seul un minimum est exigé : aucune limite d'âge maximale
  const eligible = eligibleByRule && !tooYoung;

  const hours = oneOf(str(formData, "hours_per_week"), HOURS_OPTIONS.map((o) => o.value));
  const income = oneOf(str(formData, "income_goal"), INCOME_OPTIONS.map((o) => o.value));
  const salesExperience = yesNo(str(formData, "sales_experience"));
  const dutch = oneOf(str(formData, "dutch_level"), LEVEL_OPTIONS);
  const english = oneOf(str(formData, "english_level"), LEVEL_OPTIONS);
  const french = oneOf(str(formData, "french_level"), LEVEL_OPTIONS);
  const { score, label } = computeScore({ motivation, hours_per_week: hours, sales_experience: salesExperience, dutch_level: dutch, english_level: english });

  const { error } = await supabase.from("recruitment_applications").insert({
    recruiter_id: recruiter.id,
    owner_id: recruiter.id,
    name,
    phone,
    email,
    city: str(formData, "city") || null,
    birthdate,
    eligibility,
    eligible,
    current_situation: oneOf(str(formData, "current_situation"), SITUATION_OPTIONS),
    has_cess: yesNo(str(formData, "has_cess")),
    motivation,
    hours_per_week: hours,
    sales_experience: salesExperience,
    sales_experience_note: str(formData, "sales_experience_note") || null,
    income_goal: income,
    french_level: french,
    english_level: english,
    dutch_level: dutch,
    availability_confirmed: formData.get("availability_confirmed") === "on",
    referral_source: oneOf(str(formData, "referral_source"), REFERRAL_OPTIONS),
    consent_at: new Date().toISOString(),
    score,
    score_label: label,
    status: eligible ? "Nouveau" : "Non éligible",
    status_reason: eligible ? null : tooYoung ? "Âge inférieur à 21 ans" : "Aucune des situations d'éligibilité",
  });
  if (error) return { error: "Une erreur est survenue. Réessaie dans un instant.", values };

  const firstName = firstNameOf(name);
  if (!eligible) {
    return { result: { kind: tooYoung ? "too_young" : "not_eligible", firstName, message: tooYoung ? TOO_YOUNG_MESSAGE : NOT_ELIGIBLE_MESSAGE } };
  }

  const recruiterName = displayName(recruiter.name);
  const links = (recruiter.calendly_links ?? {}) as Record<string, string>;
  const interviewUrl = interviewUrlFor(links.entretien, name, email);

  // Les emails ne doivent jamais faire échouer l'envoi du formulaire
  const scoreLabel: ScoreLabel = label;
  await Promise.allSettled([
    sendCandidateConfirmation({ to: email, name, recruiterName, interviewUrl }),
    recruiter.email
      ? sendRecruiterNotification({ to: recruiter.email, recruiterName, candidateName: name, scoreLabel, phone, email })
      : Promise.resolve(),
  ]);

  return { result: { kind: "ok", firstName, recruiterName, interviewUrl } };
}
