import { createHmac, timingSafeEqual } from "node:crypto";

// Clés d'URL des webhooks entrants (Jotform, Calendly) : dérivées de la clé service, jamais stockées dans le dépôt.
// L'URL à déclarer chez le fournisseur est `…/api/webhooks/<nom>?key=<clé>`.
export function webhookKey(label: "jotform" | "calendly" | "inbound-linkedin"): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
  return createHmac("sha256", secret).update(`webhook:${label}`).digest("hex");
}

export function isValidWebhookKey(label: "jotform" | "calendly" | "inbound-linkedin", provided: string | null): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(webhookKey(label));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signature Calendly : en-tête `Calendly-Webhook-Signature: t=<horodatage>,v1=<hmac-sha256(clé, "t.corps")>`. */
export function isValidCalendlySignature(header: string | null, rawBody: string, signingKey: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", signingKey).update(`${parts.t}.${rawBody}`).digest("hex");
  const a = Buffer.from(parts.v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
