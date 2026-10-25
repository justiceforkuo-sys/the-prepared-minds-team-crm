import { NextResponse } from "next/server";
import { SITE_ORIGIN, isAllowedRedirect, readClient } from "@/lib/mcp/auth";

// Point d'entrée OAuth appelé par Claude. Rien n'est accordé ici : on vérifie la demande, puis on envoie Justice
// sur la page de consentement du CRM, où il doit être connecté ET cliquer lui-même sur « Autoriser ».
export function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const client = readClient(q.get("client_id"));
  const redirect = q.get("redirect_uri");
  if (!client || !isAllowedRedirect(redirect) || !client.redirectUris.includes(redirect)) {
    return new Response("Demande d'autorisation invalide.", { status: 400 });
  }
  if (q.get("response_type") !== "code" || q.get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(q.get("code_challenge") ?? "")) {
    return new Response("Paramètres OAuth invalides (PKCE S256 requis).", { status: 400 });
  }
  const next = new URL(`${SITE_ORIGIN}/connecter-claude`);
  for (const k of ["client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method"]) {
    const v = q.get(k);
    if (v) next.searchParams.set(k, v);
  }
  return NextResponse.redirect(next);
}
