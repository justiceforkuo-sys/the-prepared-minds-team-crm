import { NextResponse } from "next/server";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { buildRitualIcs, sendJoinEmail } from "@/lib/linkedin/ritual-server";

// Rejoindre le Défi, changer l'heure du rituel ou renvoyer l'invitation calendrier.
// body : { ritualTime?: "HH:MM", emailDaily?: boolean, resendInvite?: boolean }
export async function POST(request: Request) {
  const person = await getCurrentPerson();
  if (!person) return NextResponse.json({ error: "non connecté" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { ritualTime?: string; emailDaily?: boolean; resendInvite?: boolean };
  if (body.ritualTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.ritualTime)) {
    return NextResponse.json({ error: "heure invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("linkedin_challenge").select("user_id, ritual_time").eq("user_id", person.id).maybeSingle();
  const isNew = !existing;

  const patch: Record<string, unknown> = { user_id: person.id, active: true };
  if (body.ritualTime) patch.ritual_time = body.ritualTime;
  if (body.emailDaily !== undefined) patch.email_daily = body.emailDaily;
  const { data: row, error } = await supabase.from("linkedin_challenge").upsert(patch, { onConflict: "user_id" }).select("ritual_time").single();
  if (error || !row) return NextResponse.json({ error: error?.message ?? "enregistrement impossible" }, { status: 500 });

  const timeChanged = !!body.ritualTime && existing && String(existing.ritual_time).slice(0, 5) !== body.ritualTime;
  let invite: "sent" | "skipped" | "failed" = "skipped";
  if ((isNew || timeChanged || body.resendInvite) && person.email) {
    // Démarre le prochain jour ouvré (demain si on est vendredi/samedi/dimanche -> lundi)
    const brussels = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
    const d = new Date(brussels.getFullYear(), brussels.getMonth(), brussels.getDate() + 1, 12);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const ritualTime = String(row.ritual_time);
    try {
      const ics = buildRitualIcs({ userId: person.id, startDate, ritualTime, sequence: Math.floor(Date.now() / 60000) });
      const res = await sendJoinEmail({ to: person.email, name: person.name, ritualTime, ics });
      invite = res.error ? "failed" : "sent";
      if (res.error) console.error("linkedin join: envoi échoué", res.error);
    } catch (err) {
      invite = "failed";
      console.error("linkedin join: envoi échoué", err);
    }
  }

  return NextResponse.json({ ok: true, isNew, invite });
}
