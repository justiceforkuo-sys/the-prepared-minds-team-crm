import { createServiceClient } from "@/utils/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_ORIGIN, verifyToken } from "@/lib/mcp/auth";
import { TOOLS } from "@/lib/mcp/tools";

// Serveur MCP (transport « Streamable HTTP », réponses JSON) : connecte Claude au CRM en LECTURE SEULE.
// Accès réservé à Justice : jeton Bearer délivré après son accord sur la page /connecter-claude.

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type RpcMessage = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${SITE_ORIGIN}/.well-known/oauth-protected-resource"`,
    },
  });
}

async function justiceId(): Promise<string | null> {
  const svc = createServiceClient() as unknown as SupabaseClient;
  const { data } = await svc.from("people").select("id, is_admin").eq("slug", "justice").maybeSingle();
  const p = data as { id: string; is_admin: boolean } | null;
  return p && p.is_admin ? p.id : null;
}

const ok = (id: RpcMessage["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: RpcMessage["id"], code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg: RpcMessage, personId: string): Promise<unknown | null> {
  const id = msg.id ?? null;
  if (msg.id === undefined) return null; // notification : pas de réponse
  switch (msg.method) {
    case "initialize": {
      const asked = typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : "";
      return ok(id, {
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "crm-prepared-minds-team", title: "CRM Prepared Minds Team (lecture seule)", version: "1.0.0" },
        instructions:
          "Accès en lecture seule au CRM de Justice Forkuo (équipe Prepared Minds Team, OVB). Aucun outil ne modifie de données. Les coordonnées des clients ne sont pas accessibles.",
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: { title: t.title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        })),
      });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return fail(id, -32602, "Outil inconnu.");
      const args = (msg.params?.arguments as Record<string, unknown> | undefined) ?? {};
      console.log(`[mcp] outil ${tool.name}`);
      try {
        const result = await tool.run(args, { personId });
        return ok(id, { content: [{ type: "text", text: JSON.stringify(result) }] });
      } catch (e) {
        return ok(id, { isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : "Erreur." }] });
      }
    }
    default:
      return fail(id, -32601, "Méthode non prise en charge.");
  }
}

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const token = verifyToken(bearer, "access");
  if (!token || typeof token.sub !== "string") return unauthorized();
  const personId = await justiceId();
  if (!personId || personId !== token.sub) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(fail(null, -32700, "JSON invalide."), { status: 400 });
  }
  const batch = Array.isArray(body);
  const results = (await Promise.all((batch ? (body as RpcMessage[]) : [body as RpcMessage]).map((m) => handle(m, personId)))).filter((r) => r !== null);
  if (results.length === 0) return new Response(null, { status: 202 });
  return Response.json(batch ? results : results[0], { headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  return new Response("Méthode non autorisée.", { status: 405, headers: { Allow: "POST" } });
}
