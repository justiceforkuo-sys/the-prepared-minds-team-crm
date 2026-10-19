import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/utils/supabase/service";
import { isValidCalendlySignature, isValidWebhookKey } from "@/lib/webhook-keys";

// Calendly → CRM : quand un candidat réserve son « Entretien de Recrutement », sa candidature passe en
// « Entretien planifié » avec la date et l'heure ; s'il annule, elle repasse en « Contacté ».
// Abonnement à créer côté Calendly (événements invitee.created et invitee.canceled) vers
//   https://<site>/api/webhooks/calendly?key=<clé>   (la clé est fournie à part ; voir src/lib/webhook-keys.ts).
// Si CALENDLY_WEBHOOK_SIGNING_KEY existe, la signature de Calendly est aussi vérifiée.

const INTERVIEW_EVENT = /entretien de recrutement/i;

interface CalendlyPayload {
  event: string;
  payload: {
    email?: string;
    name?: string;
    scheduled_event?: {
      name?: string;
      start_time?: string;
      event_memberships?: { user_email?: string }[];
    };
  };
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isValidWebhookKey("calendly", url.searchParams.get("key"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const raw = await request.text();
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (signingKey && !isValidCalendlySignature(request.headers.get("calendly-webhook-signature"), raw, signingKey)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let body: CalendlyPayload;
  try {
    body = JSON.parse(raw) as CalendlyPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = body.payload?.email?.trim().toLowerCase();
  const scheduled = body.payload?.scheduled_event;
  if (!email || !scheduled || !INTERVIEW_EVENT.test(scheduled.name ?? "")) {
    return NextResponse.json({ ignored: true });
  }

  const supabase = createServiceClient() as unknown as SupabaseClient;
  const { data: found } = await supabase
    .from("recruitment_applications")
    .select("id, status")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1);
  const application = (found as { id: string; status: string }[] | null)?.[0];

  if (body.event === "invitee.canceled") {
    if (application && application.status === "Entretien planifié") {
      await supabase
        .from("recruitment_applications")
        .update({ status: "Contacté", interview_at: null, next_action: "Replanifier l'entretien", next_action_date: new Date().toISOString().slice(0, 10) })
        .eq("id", application.id);
    }
    return NextResponse.json({ ok: true, canceled: !!application });
  }

  if (body.event !== "invitee.created" || !scheduled.start_time) return NextResponse.json({ ignored: true });

  const day = new Date(scheduled.start_time).toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const patch = {
    status: "Entretien planifié",
    interview_at: scheduled.start_time,
    next_action: "Faire l'entretien",
    next_action_date: day,
  };

  if (application) {
    if (["Nouveau", "Contacté", "Entretien planifié"].includes(application.status)) {
      await supabase.from("recruitment_applications").update(patch).eq("id", application.id);
    }
    return NextResponse.json({ ok: true, updated: application.id });
  }

  // Réservation directe sans formulaire : on crée la candidature chez l'hôte de l'entretien (s'il est dans l'équipe)
  const hostEmail = scheduled.event_memberships?.[0]?.user_email?.toLowerCase();
  const { data: host } = hostEmail ? await supabase.from("people").select("id").ilike("email", hostEmail).maybeSingle() : { data: null };
  if (!host) return NextResponse.json({ ignored: true, reason: "candidature et hôte introuvables" });
  const { error } = await supabase.from("recruitment_applications").insert({
    recruiter_id: host.id,
    owner_id: host.id,
    name: body.payload.name?.trim() || email,
    email,
    referral_source: "Calendly",
    ...patch,
  });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true, created: true });
}
