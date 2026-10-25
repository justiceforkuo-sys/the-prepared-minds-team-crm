import { MCP_URL, SITE_ORIGIN } from "@/lib/mcp/auth";

// Métadonnées de la ressource protégée (RFC 9728), servies sous /.well-known/oauth-protected-resource.
export function GET() {
  return Response.json({
    resource: MCP_URL,
    authorization_servers: [SITE_ORIGIN],
    bearer_methods_supported: ["header"],
    scopes_supported: ["crm:read"],
    resource_name: "CRM Prepared Minds Team (lecture seule)",
  });
}
