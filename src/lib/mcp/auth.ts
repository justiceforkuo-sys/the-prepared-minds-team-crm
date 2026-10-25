import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

// Connecteur Claude (MCP) en lecture seule, réservé à Justice.
// Jetons « sans état » signés en HMAC-SHA256 avec une clé dérivée de la clé service (jamais stockée dans le dépôt).
// Pour invalider TOUS les jetons déjà émis (perte d'un téléphone, par exemple) : incrémenter TOKEN_VERSION.

const TOKEN_VERSION = 1;

export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-prepared-minds-team-crm.vercel.app").replace(/\/$/, "");
export const MCP_URL = `${SITE_ORIGIN}/api/mcp`;

export const ACCESS_TTL = 60 * 60; // 1 heure
export const REFRESH_TTL = 30 * 24 * 60 * 60; // 30 jours
export const CODE_TTL = 5 * 60; // 5 minutes

/** Seuls les rappels d'autorisation de Claude (web, bureau, téléphone) sont acceptés : le code ne part jamais ailleurs. */
export const ALLOWED_REDIRECTS = ["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"];

function secret(): Buffer {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
  return createHmac("sha256", base).update(`mcp-connector:v${TOKEN_VERSION}`).digest();
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export type TokenType = "client" | "code" | "access" | "refresh";
export interface TokenPayload {
  t: TokenType;
  exp: number;
  jti: string;
  [k: string]: unknown;
}

export function signToken(type: TokenType, ttlSeconds: number, data: Record<string, unknown> = {}): string {
  const payload: TokenPayload = { ...data, t: type, exp: Math.floor(Date.now() / 1000) + ttlSeconds, jti: randomUUID() };
  const body = b64(JSON.stringify(payload));
  const sig = b64(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string | null | undefined, type: TokenType): TokenPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (p.t !== type || typeof p.exp !== "number" || p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export const isAllowedRedirect = (uri: unknown): uri is string => typeof uri === "string" && ALLOWED_REDIRECTS.includes(uri);

export interface ClientInfo {
  id: string;
  name: string;
  redirectUris: string[];
}

/** L'identifiant de client est lui-même un jeton signé : aucune table à tenir à jour. */
export function readClient(clientId: string | null | undefined): ClientInfo | null {
  const p = verifyToken(clientId, "client");
  if (!p || !Array.isArray(p.ru) || !p.ru.every(isAllowedRedirect)) return null;
  return { id: clientId as string, name: typeof p.n === "string" ? p.n.slice(0, 80) : "Claude", redirectUris: p.ru as string[] };
}

export function oauthError(error: string, description: string, status = 400): Response {
  return Response.json({ error, error_description: description }, { status, headers: { "Cache-Control": "no-store" } });
}
