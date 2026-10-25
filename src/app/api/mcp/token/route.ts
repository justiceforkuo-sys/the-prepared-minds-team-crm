import { timingSafeEqual } from "node:crypto";
import { ACCESS_TTL, REFRESH_TTL, oauthError, pkceChallenge, readClient, signToken, verifyToken } from "@/lib/mcp/auth";

async function readParams(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  const out: Record<string, string> = {};
  if (type.includes("application/json")) {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [k, v] of Object.entries(json)) if (typeof v === "string") out[k] = v;
  } else {
    const form = await request.formData().catch(() => null);
    form?.forEach((v, k) => {
      if (typeof v === "string") out[k] = v;
    });
  }
  return out;
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function issue(sub: string, clientId: string) {
  return Response.json(
    {
      access_token: signToken("access", ACCESS_TTL, { sub, cid: clientId }),
      token_type: "Bearer",
      expires_in: ACCESS_TTL,
      refresh_token: signToken("refresh", REFRESH_TTL, { sub, cid: clientId }),
      scope: "crm:read",
    },
    { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } }
  );
}

export async function POST(request: Request) {
  const p = await readParams(request);
  const client = readClient(p.client_id);
  if (!client) return oauthError("invalid_client", "Client inconnu.", 401);

  if (p.grant_type === "authorization_code") {
    const code = verifyToken(p.code, "code");
    if (!code || code.cid !== p.client_id || code.ru !== p.redirect_uri || typeof code.sub !== "string" || typeof code.cc !== "string") {
      return oauthError("invalid_grant", "Code invalide ou expiré.");
    }
    if (!p.code_verifier || !same(pkceChallenge(p.code_verifier), code.cc)) return oauthError("invalid_grant", "Vérification PKCE échouée.");
    return issue(code.sub, p.client_id);
  }

  if (p.grant_type === "refresh_token") {
    const r = verifyToken(p.refresh_token, "refresh");
    if (!r || r.cid !== p.client_id || typeof r.sub !== "string") return oauthError("invalid_grant", "Jeton de renouvellement invalide ou expiré.");
    return issue(r.sub, p.client_id);
  }

  return oauthError("unsupported_grant_type", "Type d'autorisation non pris en charge.");
}
