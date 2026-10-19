import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { dayIndexFromIso, phraseOfTheDay, hhmm } from "./challenge";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-prepared-minds-team-crm.vercel.app";

function hmac(label: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
  return createHmac("sha256", key).update(label).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Secret que pg_cron envoie au point d'entrée du rituel (dérivé, jamais stocké dans le dépôt). */
export function cronSecret(): string {
  return hmac("linkedin-ritual");
}

export function isCronAuthorized(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  return safeEqual(authHeader.slice(7), cronSecret());
}

export function unsubscribeToken(userId: string): string {
  return hmac(`linkedin-unsub:${userId}`);
}

export function isUnsubscribeTokenValid(userId: string, token: string): boolean {
  return safeEqual(token, unsubscribeToken(userId));
}

export function unsubscribeUrl(userId: string): string {
  return `${SITE_URL}/api/linkedin/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

// ---------------------------------------------------------------------------
// Invitation calendrier (.ics) : rituel récurrent lun-ven, 20 min, heure de Bruxelles
// ---------------------------------------------------------------------------

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line: string): string {
  // RFC 5545 : lignes de 75 octets maximum, continuation par un espace
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

/** `startDate` = premier jour ouvré (YYYY-MM-DD) à partir duquel le rituel démarre. */
export function buildRitualIcs(opts: { userId: string; startDate: string; ritualTime: string; sequence: number }): string {
  const [h, m] = hhmm(opts.ritualTime).split(":");
  const dt = `${opts.startDate.replace(/-/g, "")}T${h}${m}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Prepared Minds Team//Batisseur//FR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Brussels",
    "BEGIN:STANDARD",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:linkedin-ritual-${opts.userId}@preparedminds`,
    `DTSTAMP:${stamp}`,
    `SEQUENCE:${opts.sequence}`,
    `DTSTART;TZID=Europe/Brussels:${dt}`,
    "DURATION:PT20M",
    "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    `SUMMARY:${icsEscape("Rituel LinkedIn — 20 min")}`,
    `DESCRIPTION:${icsEscape(`Ton rendez-vous quotidien avec ton pipeline : réponses d'abord, relances ensuite, puis tes premiers messages.\n${SITE_URL}/linkedin`)}`,
    `URL:${SITE_URL}/linkedin`,
    "BEGIN:VALARM",
    "TRIGGER:-PT5M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rituel LinkedIn dans 5 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Courriels
// ---------------------------------------------------------------------------

function from(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Prepared Minds Team <onboarding@resend.dev>";
}

export async function sendJoinEmail(opts: { to: string; name: string; ritualTime: string; ics: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const first = opts.name.split(" ")[0];
  const text = [
    `Bonjour ${first},`,
    "",
    `Bienvenue dans le Défi LinkedIn ! Ton rituel est fixé à ${hhmm(opts.ritualTime)}, du lundi au vendredi, 20 minutes.`,
    "",
    "Le fichier joint ajoute le rituel à ton agenda (Google Agenda, Outlook, Apple Calendrier). Il se répète tous les jours ouvrés.",
    "",
    `Chaque matin, 15 minutes avant, tu recevras un petit mail avec ce qui t'attend. Ton pipeline : ${SITE_URL}/linkedin`,
    "",
    "Prepared Minds Team",
  ].join("\n");
  return resend.emails.send({
    from: from(),
    to: opts.to,
    subject: "🔥 Ton rituel LinkedIn est dans ton agenda",
    text,
    attachments: [{ filename: "rituel-linkedin.ics", content: Buffer.from(opts.ics, "utf8"), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
  });
}

export interface DigestInput {
  n_reponses: number;
  n_relances: number;
  n_prioritaires: number;
  streak: number;
  points_week: number;
  team_rdv: number;
  team_target: number | null;
}

export function buildRitualEmail(opts: { name: string; today: string; userId: string; ritualTime: string; digest: DigestInput }) {
  const d = opts.digest;
  const first = opts.name.split(" ")[0];
  const phrase = phraseOfTheDay(dayIndexFromIso(opts.today));
  const nothing = d.n_reponses === 0 && d.n_relances === 0 && d.n_prioritaires === 0;

  const subject =
    d.n_reponses > 0
      ? `🔥 Ton rituel LinkedIn : ${d.n_reponses} réponse${d.n_reponses > 1 ? "s" : ""} t'attend${d.n_reponses > 1 ? "ent" : ""}`
      : "🔥 Ton rituel LinkedIn de ce matin";

  const todo: string[] = [];
  if (d.n_reponses > 0) todo.push(`${d.n_reponses} réponse${d.n_reponses > 1 ? "s" : ""} à traiter en premier`);
  if (d.n_relances > 0) todo.push(`${d.n_relances} relance${d.n_relances > 1 ? "s" : ""} à faire`);
  if (d.n_prioritaires > 0) todo.push(`${d.n_prioritaires} contact${d.n_prioritaires > 1 ? "s" : ""} prioritaire${d.n_prioritaires > 1 ? "s" : ""} à contacter`);

  const stats: string[] = [];
  if (d.streak > 0) stats.push(`🔥 ${d.streak} jour${d.streak > 1 ? "s" : ""} d'affilée`);
  stats.push(`${d.points_week} point${d.points_week > 1 ? "s" : ""} cette semaine`);
  if (d.team_target) stats.push(`Équipe : ${d.team_rdv} / ${d.team_target} RDV`);

  const unsub = unsubscribeUrl(opts.userId);
  const link = `${SITE_URL}/linkedin`;

  const intro = nothing
    ? "Rien d'urgent ce matin. Profites-en pour envoyer tes premiers messages : cinq suffisent pour garder ta série."
    : "Voici ce qui t'attend ce matin :";

  const text = [
    `Bonjour ${first},`,
    "",
    intro,
    ...(nothing ? [] : todo.map((t) => `• ${t}`)),
    "",
    stats.join(" · "),
    "",
    `« ${phrase} »`,
    "",
    `Ouvrir mon pipeline : ${link}`,
    `Rituel à ${hhmm(opts.ritualTime)} — 20 minutes.`,
    "",
    `Se désinscrire de ce mail : ${unsub}`,
  ].join("\n");

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;color:#172047">
<div style="max-width:520px;margin:0 auto;padding:20px 16px">
  <div style="background:#ffffff;border-radius:14px;padding:22px;border:1px solid #e3e6ee">
    <div style="font-size:13px;color:#6b7491;margin-bottom:6px">Prepared Minds Team · Rituel LinkedIn</div>
    <h1 style="font-size:20px;margin:0 0 12px;color:#172047">Bonjour ${esc(first)},</h1>
    <p style="font-size:15px;line-height:1.5;margin:0 0 10px">${esc(intro)}</p>
    ${nothing ? "" : `<ul style="font-size:15px;line-height:1.6;margin:0 0 14px;padding-left:20px">${todo.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`}
    <p style="font-size:13px;margin:0 0 14px;color:#4a5272">${esc(stats.join(" · "))}</p>
    <p style="font-size:14px;font-style:italic;margin:0 0 18px;color:#172047;border-left:3px solid #f5cd54;padding-left:10px">${esc(phrase)}</p>
    <a href="${link}" style="display:inline-block;background:#172047;color:#f5cd54;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 18px;border-radius:10px">Ouvrir mon pipeline</a>
    <p style="font-size:12px;color:#6b7491;margin:14px 0 0">Rituel à ${hhmm(opts.ritualTime)} — 20 minutes.</p>
  </div>
  <p style="font-size:11px;color:#8a91a8;text-align:center;margin:12px 0 0"><a href="${unsub}" style="color:#8a91a8">Se désinscrire de ce mail</a></p>
</div></body></html>`;

  return { subject, text, html };
}

export async function sendRitualEmail(opts: { to: string; subject: string; text: string; html: string; unsubscribe: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: from(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    headers: { "List-Unsubscribe": `<${opts.unsubscribe}>` },
  });
}
