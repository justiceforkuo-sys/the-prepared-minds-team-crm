"use server";

import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { CODE_TTL, isAllowedRedirect, readClient, signToken } from "@/lib/mcp/auth";

/** Seul Justice peut connecter Claude au CRM. */
export async function isJustice(): Promise<{ id: string } | null> {
  const me = await getCurrentPerson();
  const slug = (me as { slug?: string | null } | null)?.slug;
  return me && me.is_admin && slug === "justice" ? { id: me.id } : null;
}

/** Réponse de Justice à la demande de Claude : le code d'autorisation n'est délivré que par ce clic, depuis sa session. */
export async function decider(formData: FormData): Promise<void> {
  const me = await isJustice();
  if (!me) redirect("/");
  const get = (k: string) => String(formData.get(k) ?? "");
  const client = readClient(get("client_id"));
  const redirectUri = get("redirect_uri");
  const challenge = get("code_challenge");
  if (!client || !isAllowedRedirect(redirectUri) || !client.redirectUris.includes(redirectUri) || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) redirect("/");

  const target = new URL(redirectUri);
  const state = get("state");
  if (state) target.searchParams.set("state", state);
  if (get("decision") !== "allow") {
    target.searchParams.set("error", "access_denied");
    redirect(target.toString());
  }
  target.searchParams.set("code", signToken("code", CODE_TTL, { sub: me.id, cid: client.id, ru: redirectUri, cc: challenge }));
  redirect(target.toString());
}
