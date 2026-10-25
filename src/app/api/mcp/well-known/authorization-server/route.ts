import { SITE_ORIGIN } from "@/lib/mcp/auth";

// Métadonnées OAuth (RFC 8414), servies sous /.well-known/oauth-authorization-server (réécriture dans next.config.ts).
export function GET() {
  return Response.json({
    issuer: SITE_ORIGIN,
    authorization_endpoint: `${SITE_ORIGIN}/api/mcp/authorize`,
    token_endpoint: `${SITE_ORIGIN}/api/mcp/token`,
    registration_endpoint: `${SITE_ORIGIN}/api/mcp/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["crm:read"],
  });
}
