import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/utils/supabase/service";
import { buildRitualEmail, isCronAuthorized, sendRitualEmail, unsubscribeUrl, type DigestInput } from "@/lib/linkedin/ritual-server";
import { emailMinuteFor } from "@/lib/linkedin/challenge";

// Appelé toutes les 15 minutes par pg_cron (Supabase) via pg_net, avec le secret dérivé.
// Un participant reçoit son mail une fois par jour ouvré, à partir de « rituel − 15 min »,
// avec une fenêtre de rattrapage de 60 minutes si un passage a été manqué.
const GRACE_MINUTES = 60;

interface ChallengeRow {
  user_id: string;
  ritual_time: string;
  last_email_on: string | null;
  person: { name: string; email: string | null } | { name: string; email: string | null }[] | null;
}

export async function POST(request: Request) {
  return run(request);
}
export async function GET(request: Request) {
  return run(request);
}

async function run(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const hm = now.toLocaleTimeString("en-GB", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit", hour12: false });
  const [h, m] = hm.split(":").map(Number);
  const minuteNow = h * 60 + m;
  const weekday = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Brussels" })).getDay();
  if (weekday === 0 || weekday === 6) return NextResponse.json({ skipped: "week-end" });

  const supabase = createServiceClient() as unknown as SupabaseClient;
  const { data, error } = await supabase
    .from("linkedin_challenge")
    .select("user_id, ritual_time, last_email_on, person:people!linkedin_challenge_user_id_fkey(name, email)")
    .eq("active", true)
    .eq("email_daily", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of (data as unknown as ChallengeRow[] | null) ?? []) {
    if (row.last_email_on === today) continue;
    const start = emailMinuteFor(row.ritual_time);
    if (minuteNow < start || minuteNow >= start + GRACE_MINUTES) {
      skipped += 1;
      continue;
    }
    const person = Array.isArray(row.person) ? row.person[0] : row.person;
    if (!person?.email) {
      skipped += 1;
      continue;
    }

    // On réserve la journée d'abord : deux passages simultanés ne peuvent pas envoyer deux fois.
    const { data: claimed } = await supabase
      .from("linkedin_challenge")
      .update({ last_email_on: today })
      .eq("user_id", row.user_id)
      .or(`last_email_on.is.null,last_email_on.lt.${today}`)
      .select("user_id");
    if (!claimed || claimed.length === 0) continue;

    try {
      const { data: digestRows, error: dErr } = await supabase.rpc("linkedin_ritual_digest", { p_person: row.user_id });
      if (dErr) throw dErr;
      const digest = (digestRows as DigestInput[] | null)?.[0];
      if (!digest) throw new Error("digest vide");
      const mail = buildRitualEmail({ name: person.name, today, userId: row.user_id, ritualTime: row.ritual_time, digest });
      const res = await sendRitualEmail({ to: person.email, ...mail, unsubscribe: unsubscribeUrl(row.user_id) });
      if (res.error) throw new Error(res.error.message);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error("linkedin-ritual: envoi échoué", row.user_id, err);
      // on libère la journée pour qu'un prochain passage puisse réessayer
      await supabase.from("linkedin_challenge").update({ last_email_on: row.last_email_on }).eq("user_id", row.user_id);
    }
  }

  return NextResponse.json({ today, sent, skipped, failed });
}
