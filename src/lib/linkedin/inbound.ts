// Voie 1 du bloc 7 : transformer un email LinkedIn « invitation acceptée » (transféré par le collaborateur
// vers son adresse de réception) en fiche du Pipeline. Logique pure : aucun accès réseau ni base.
// Aucune extension, aucun scraping : on ne lit que des emails que la personne choisit de transférer.
import { normalize } from "./classify";

export interface InboundEmail {
  from: string;
  subject: string;
  text: string;
  html: string;
  /** Date de l'email (ISO ou RFC 2822). */
  date: string | null;
}

export interface ParsedRelation {
  kind: "relation";
  first_name: string;
  last_name: string;
  linkedin_url: string;
  position: string | null;
  company: string | null;
}

export interface GmailConfirmation {
  kind: "confirmation";
  code: string | null;
  link: string | null;
}

export type ParsedEmail = ParsedRelation | GmailConfirmation | { kind: "ignore"; reason: string };

const REPLY_PREFIX = /^\s*(?:(?:re|fwd?|tr|aw|wg|doorgestuurd)\s*:\s*)+/i;

// Objets reconnus (FR, EN, NL). Le nom est le premier groupe.
const SUBJECT_PATTERNS: RegExp[] = [
  /^(.+?)\s+a\s+accept[ée]\s+(?:votre|ton|ta|vos)\s+(?:invitation|demande)/i,
  /^(.+?)\s+(?:has\s+)?accepted\s+your\s+(?:invitation|connection\s+request|request)/i,
  /^(.+?)\s+heeft\s+(?:uw|je|jouw)\s+(?:uitnodiging|verzoek)\s+geaccepteerd/i,
  /(?:vous\s+[êe]tes|tu\s+es)\s+(?:maintenant|d[ée]sormais)\s+en\s+relation\s+avec\s+(.+)$/i,
  /you(?:'|’)re\s+now\s+connected\s+(?:to|with)\s+(.+)$/i,
  /u\s+bent\s+nu\s+verbonden\s+met\s+(.+)$/i,
];

export function stripReplyPrefix(subject: string): string {
  return subject.replace(REPLY_PREFIX, "").trim();
}

export function parseAcceptanceSubject(subject: string): string | null {
  const s = stripReplyPrefix(subject);
  for (const re of SUBJECT_PATTERNS) {
    const m = s.match(re);
    if (m) {
      const name = cleanName(m[1]);
      if (name) return name;
    }
  }
  return null;
}

function cleanName(raw: string): string {
  return raw
    .replace(/[​-‏‪-‮]/g, "")
    .replace(/\s*[!.:;,\-–—|]+\s*$/g, "")
    .replace(/^\s*["«“]+|["»”]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", eacute: "é", egrave: "è" };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6]|table|td)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

const PROFILE_URL = /https?:\/\/(?:[a-z]{2,3}\.|www\.)?linkedin\.com\/(?:comm\/)?in\/([A-Za-z0-9\-_%.]+)/gi;

/** Normalise vers https://www.linkedin.com/in/<identifiant> (comme l'import de Connections.csv). */
export function normalizeInboundProfileUrl(slug: string): string {
  return `https://www.linkedin.com/in/${slug.replace(/[.]+$/, "")}`;
}

export function extractProfileUrl(html: string, text: string, name: string): string | null {
  const source = decodeEntities(`${html}\n${text}`);
  const slugs: string[] = [];
  for (const m of source.matchAll(PROFILE_URL)) {
    const slug = m[1];
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }
  if (slugs.length === 0) return null;
  // De préférence le lien dont l'identifiant ressemble au nom ; sinon le premier lien profil de l'email
  const tokens = normalize(name).split(" ").filter((t) => t.length > 1);
  const best = slugs.find((s) => {
    const n = normalize(decodeURIComponent(s.replace(/%(?![0-9a-f]{2})/gi, "")));
    return tokens.length > 0 && tokens.every((t) => n.includes(t));
  });
  return normalizeInboundProfileUrl(best ?? slugs[0]);
}

const CTA = /(voir|view|bekijk|afficher|say|dites|envoyer|send|message|bericht|accept|unsubscribe|d[ée]sabonn|linkedin|http|©|ignore|réponse|reply|congrat|f[ée]liciter|félicit|inviter|connect|relation)/i;
const AT = /\s+(?:chez|at|bij|@)\s+/i;

/** Titre / entreprise : la ligne qui suit le nom dans la version texte, si elle ressemble à un titre. */
export function extractHeadline(text: string, name: string): { position: string | null; company: string | null } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const target = normalize(name);
  const idx = lines.findIndex((l) => normalize(l) === target || normalize(l).startsWith(`${target} `) && l.length <= name.length + 6);
  if (idx < 0) return { position: null, company: null };
  const next = lines[idx + 1] ?? "";
  if (next.length < 3 || next.length > 140 || CTA.test(next)) return { position: null, company: null };
  const split = next.split(AT);
  if (split.length >= 2) return { position: split[0].trim() || null, company: split.slice(1).join(" ").trim() || null };
  return { position: next, company: null };
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.split(" ").filter(Boolean);
  return { first: parts[0] ?? name, last: parts.slice(1).join(" ") };
}

const GMAIL_CONFIRM_SUBJECT = /gmail forwarding confirmation|confirmation de transfert|doorstuurbevestiging|gmail-doorstuurbevestiging/i;

function parseGmailConfirmation(email: InboundEmail): GmailConfirmation | null {
  if (!GMAIL_CONFIRM_SUBJECT.test(email.subject) && !/forwarding-noreply@google\.com/i.test(email.from)) return null;
  const body = decodeEntities(`${email.html}\n${email.text}`);
  const link = body.match(/https:\/\/mail-settings\.google\.com\/mail\/[^\s"'<>]+/i)?.[0] ?? body.match(/https:\/\/mail\.google\.com\/mail\/vf-[^\s"'<>]+/i)?.[0] ?? null;
  const code = email.subject.match(/\b(\d{6,9})\b/)?.[1] ?? body.match(/(?:code|confirmation)[^0-9]{0,40}(\d{6,9})/i)?.[1] ?? null;
  return { kind: "confirmation", code, link };
}

export function parseLinkedinEmail(email: InboundEmail): ParsedEmail {
  const confirmation = parseGmailConfirmation(email);
  if (confirmation) return confirmation;

  const name = parseAcceptanceSubject(email.subject);
  if (!name) return { kind: "ignore", reason: "objet non reconnu (pas une invitation acceptée)" };

  const text = email.text.trim() ? email.text : htmlToText(email.html);
  const url = extractProfileUrl(email.html, email.text, name);
  if (!url) return { kind: "ignore", reason: "aucun lien de profil LinkedIn dans l'email" };

  const { position, company } = extractHeadline(text, name);
  const { first, last } = splitName(name);
  return { kind: "relation", first_name: first, last_name: last, linkedin_url: url, position, company };
}

/** Adresse de réception : linkedin+<slug>-<code>@<domaine>. */
export function inboxAddress(slug: string | null, code: string, domain: string): string {
  const safe = (slug ?? "collab").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "collab";
  return `linkedin+${safe}-${code}@${domain}`;
}

/** Retrouve le code de réception dans une adresse destinataire (ou une liste d'adresses). */
export function inboxCodeFrom(recipients: string[]): string | null {
  for (const r of recipients) {
    const m = r.match(/linkedin\+[a-z0-9]*-([0-9a-f]{8})@/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}
