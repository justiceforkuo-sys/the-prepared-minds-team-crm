import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { JOTFORM_RECRUITER_BY_FORM_ID } from "@/lib/jotform-forms";

// Jotform envoie le champ "pretty" sous la forme :
// "Nom complet:John Doe, Téléphone:0470 12 34 56, Email:john@test.com, ..."
// — un couple "Libellé:Valeur" par question, séparés par ", ". On parse ça en
// objet { libellé -> valeur } puis on retrouve chaque champ par mot-clé dans le
// libellé, ce qui reste robuste même si les 5 formulaires ont des qid internes
// différents (ils ont été créés indépendamment, pas clonés).
function parsePretty(pretty: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = pretty.split(/,\s+(?=[^,:]+:)/);
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const label = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (label) result[label] = value;
  }
  return result;
}

function findByKeyword(fields: Record<string, string>, keyword: string): string | null {
  const entry = Object.entries(fields).find(([label]) =>
    label.toLowerCase().includes(keyword.toLowerCase())
  );
  return entry ? entry[1] : null;
}

function parseBirthdate(raw: string | null): string | null {
  if (!raw) return null;
  // Jotform date fields typically render as "MM-DD-YYYY" or "MM/DD/YYYY" in pretty text.
  const match = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const formId = formData.get("formID")?.toString() ?? "";
  const submissionId = formData.get("submissionID")?.toString() ?? "";
  const pretty = formData.get("pretty")?.toString() ?? "";

  if (!formId || !submissionId || !pretty) {
    return NextResponse.json({ error: "missing formID/submissionID/pretty" }, { status: 400 });
  }

  const recruiterName = JOTFORM_RECRUITER_BY_FORM_ID[formId];
  if (!recruiterName) {
    return NextResponse.json({ error: "unknown formID, not mapped to a recruiter" }, { status: 400 });
  }

  const fields = parsePretty(pretty);
  const supabase = createServiceClient();

  const { data: recruiter } = await supabase
    .from("people")
    .select("id")
    .eq("name", recruiterName)
    .maybeSingle();

  const cess = findByKeyword(fields, "CESS");
  const availability = findByKeyword(fields, "disponible");

  const { error } = await supabase.from("recruitment_applications").upsert(
    {
      jotform_submission_id: submissionId,
      recruiter_id: recruiter?.id ?? null,
      name: findByKeyword(fields, "Nom complet") ?? findByKeyword(fields, "Nom") ?? "Candidat sans nom",
      phone: findByKeyword(fields, "Téléphone"),
      email: findByKeyword(fields, "Email"),
      nationality: findByKeyword(fields, "Nationalité"),
      current_situation: findByKeyword(fields, "Situation professionnelle"),
      birthdate: parseBirthdate(findByKeyword(fields, "naissance")),
      has_cess: cess ? /oui/i.test(cess) : null,
      availability_confirmed: availability !== null && availability !== "",
      french_level: findByKeyword(fields, "français"),
      english_level: findByKeyword(fields, "anglais"),
      referral_source: findByKeyword(fields, "entendu parler"),
    },
    { onConflict: "jotform_submission_id" }
  );

  if (error) {
    console.error("jotform webhook insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
