import { isAllowedRedirect, oauthError, signToken } from "@/lib/mcp/auth";

// Enregistrement dynamique d'un client OAuth (RFC 7591) : Claude s'enregistre lui-même lors de l'ajout du connecteur.
// Seules les adresses de rappel officielles de Claude sont acceptées.
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return oauthError("invalid_client_metadata", "Corps JSON attendu.");
  }
  const uris = body.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || !uris.every(isAllowedRedirect)) {
    return oauthError("invalid_redirect_uri", "Adresse de rappel non autorisée.");
  }
  const name = typeof body.client_name === "string" ? body.client_name.slice(0, 80) : "Claude";
  // Jeton de client valable un an ; il n'ouvre aucun accès par lui-même (il faut ensuite l'accord de Justice).
  const clientId = signToken("client", 365 * 24 * 60 * 60, { ru: uris, n: name });
  return Response.json(
    {
      client_id: clientId,
      client_name: name,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
