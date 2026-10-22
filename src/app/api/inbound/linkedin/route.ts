import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/utils/supabase/service";
import { isValidWebhookKey } from "@/lib/webhook-keys";
import { classify, buildTeamNames } from "@/lib/linkedin/classify";
import { inboxCodeFrom, parseLinkedinEmail, type InboundEmail } from "@/lib/linkedin/inbound";

// Voie 1 du bloc 7 : réception des emails LinkedIn « invitation acceptée » transférés par le collaborateur vers
// son adresse personnelle linkedin+<nom>-<code>@<domaine de réception>.
// Le fournisseur d'emails entrants (Cloudflare Email Routing + Worker, Postmark, Mailgun, SendGrid…) envoie
// chaque email ici en POST, avec ?key=<clé> (voir src/lib/webhook-keys.ts, nom « inbound-linkedin »).
// Formats acceptés : JSON {from, to, subject, text, html, date} ou formulaire (multipart / urlencoded).
// Aucun email n'est lu sur LinkedIn : on ne traite que ce que la personne choisit de transférer.

const RAW_LIMIT = 20000;

function asList(v: unknown): string[] {
  if (!v) return [];
  if (typeof v === "string") return v.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap((x) => (typeof x === "string" ? asList(x) : typeof x === "object" && x ? asList((x as { address?: string; email?: string }).address ?? (x as { email?: string }).email) : []));
  return [];
}

interface Normalized extends InboundEmail {
  recipients: string[];
}

async function readEmail(request: Request): Promise<Normalized | null> {
  const type = request.headers.get("content-type") ?? "";
  let data: Record<string, unknown> = {};
  if (type.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    // Enveloppe « événement » de certains fournisseurs : { type, data: {…} }
    data = json.data && typeof json.data === "object" ? { ...json, ...(json.data as Record<string, unknown>) } : json;
  } else if (type.includes("form")) {
    const form = await request.formData();
    form.forEach((v, k) => {
      if (typeof v === "string") data[k] = v;
    });
  } else {
    return null;
  }
  // Resend (emails entrants) : l'événement « email.received » ne porte que les métadonnées ; le corps se lit via l'API.
  if (!data.text && !data.html && typeof data.email_id === "string" && process.env.RESEND_API_KEY) {
    const res = await fetch(`https://api.resend.com/emails/receiving/${data.email_id}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    }).catch(() => null);
    if (res?.ok) data = { ...data, ...((await res.json()) as Record<string, unknown>) };
  }
  const headers = (data.headers && typeof data.headers === "object" ? data.headers : {}) as Record<string, unknown>;
  const envelope = (typeof data.envelope === "string" ? safeJson(data.envelope) : data.envelope) as { to?: unknown } | null;
  const recipients = [
    ...asList(data.to),
    ...asList(data.recipient),
    ...asList(envelope?.to),
    ...asList(headers["x-original-to"]),
    ...asList(headers["delivered-to"]),
  ];
  const from = typeof data.from === "string" ? data.from : asList(data.from).join(", ");
  return {
    from,
    subject: typeof data.subject === "string" ? data.subject : "",
    text: typeof data.text === "string" ? data.text : typeof data["body-plain"] === "string" ? (data["body-plain"] as string) : "",
    html: typeof data.html === "string" ? data.html : typeof data["body-html"] === "string" ? (data["body-html"] as string) : "",
    date: typeof data.date === "string" ? data.date : typeof data.created_at === "string" ? data.created_at : null,
    recipients,
  };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

const brusselsDate = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isValidWebhookKey("inbound-linkedin", url.searchParams.get("key"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const email = await readEmail(request).catch(() => null);
  if (!email) return NextResponse.json({ error: "format non supporté" }, { status: 400 });

  const supabase = createServiceClient() as unknown as SupabaseClient;
  const log = (row: { owner_id: string | null; result: "cree" | "doublon" | "ignore" | "confirmation" | "erreur"; detail?: string; contact_id?: string | null; keepRaw?: boolean }) =>
    supabase.from("linkedin_inbound_log").insert({
      owner_id: row.owner_id,
      from_addr: email.from.slice(0, 200),
      subject: email.subject.slice(0, 300),
      result: row.result,
      detail: row.detail ?? null,
      contact_id: row.contact_id ?? null,
      // Le contenu brut n'est gardé que pour les emails traités (supprimé après 30 jours) ; jamais pour les ignorés
      raw_body: row.keepRaw ? (email.text || email.html).slice(0, RAW_LIMIT) : null,
    });

  const code = inboxCodeFrom(email.recipients);
  const { data: owner } = code
    ? await supabase.from("people").select("id, name").eq("linkedin_inbox_code", code).maybeSingle()
    : { data: null };
  if (!owner) {
    await log({ owner_id: null, result: "erreur", detail: "destinataire inconnu (code de réception absent ou invalide)" });
    return NextResponse.json({ ignored: true, reason: "unknown recipient" });
  }
  const ownerId = (owner as { id: string }).id;

  const parsed = parseLinkedinEmail(email);

  if (parsed.kind === "ignore") {
    await log({ owner_id: ownerId, result: "ignore", detail: parsed.reason });
    return NextResponse.json({ result: "ignore" });
  }

  if (parsed.kind === "confirmation") {
    // Gmail demande de confirmer l'adresse de transfert : on affiche le code ou le lien au collaborateur
    await log({
      owner_id: ownerId,
      result: "confirmation",
      detail: [parsed.code ? `Code de confirmation Gmail : ${parsed.code}` : null, parsed.link ? `Lien : ${parsed.link}` : null].filter(Boolean).join(" · ") || "Email de confirmation Gmail reçu",
    });
    return NextResponse.json({ result: "confirmation" });
  }

  const { data: existing } = await supabase
    .from("linkedin_contacts")
    .select("id, company, position")
    .eq("owner_id", ownerId)
    .eq("linkedin_url", parsed.linkedin_url)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; company: string | null; position: string | null };
    const patch: Record<string, string> = {};
    if (!row.company && parsed.company) patch.company = parsed.company;
    if (!row.position && parsed.position) patch.position = parsed.position;
    if (Object.keys(patch).length > 0) await supabase.from("linkedin_contacts").update(patch).eq("id", row.id);
    await log({ owner_id: ownerId, result: "doublon", detail: `${parsed.first_name} ${parsed.last_name} est déjà dans le pipeline`, contact_id: row.id, keepRaw: true });
    return NextResponse.json({ result: "doublon" });
  }

  const { data: people } = await supabase.from("people").select("name");
  const team = buildTeamNames(((people as { name: string }[] | null) ?? []).map((p) => p.name));
  const c = classify({ firstName: parsed.first_name, lastName: parsed.last_name, position: parsed.position, company: parsed.company }, team);
  const emailDate = email.date && !Number.isNaN(Date.parse(email.date)) ? new Date(email.date) : new Date();

  const { data: created, error } = await supabase
    .from("linkedin_contacts")
    .upsert(
      {
        owner_id: ownerId,
        first_name: parsed.first_name,
        last_name: parsed.last_name,
        linkedin_url: parsed.linkedin_url,
        company: parsed.company,
        position: parsed.position,
        connected_on: brusselsDate(emailDate),
        grp: c.grp,
        priority: c.priority,
        status: c.grp === "E" ? "Équipe / réseau" : "À contacter",
        tags: ["Nouvelle relation", ...c.tags],
      },
      { onConflict: "owner_id,linkedin_url", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    await log({ owner_id: ownerId, result: "erreur", detail: error.message, keepRaw: true });
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }
  await log({
    owner_id: ownerId,
    result: "cree",
    detail: `${parsed.first_name} ${parsed.last_name} · groupe ${c.grp}`,
    contact_id: (created as { id: string } | null)?.id ?? null,
    keepRaw: true,
  });
  return NextResponse.json({ result: "cree" });
}
