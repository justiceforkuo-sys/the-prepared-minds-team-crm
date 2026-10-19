import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/utils/supabase/service";
import { isUnsubscribeTokenValid, SITE_URL } from "@/lib/linkedin/ritual-server";

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f5f8;color:#172047"><div style="max-width:440px;margin:60px auto;padding:0 16px">
<div style="background:#fff;border:1px solid #e3e6ee;border-radius:14px;padding:24px"><h1 style="font-size:18px;margin:0 0 10px">${title}</h1><p style="font-size:14px;line-height:1.5;margin:0 0 16px">${body}</p>
<a href="${SITE_URL}/linkedin/defi" style="color:#172047;font-weight:bold;font-size:14px">Gérer mon Défi LinkedIn</a></div></div></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !isUnsubscribeTokenValid(userId, token)) {
    return page("Lien invalide", "Ce lien de désinscription n'est pas valide. Tu peux couper le mail du matin depuis la page du Défi.", 400);
  }
  const supabase = createServiceClient() as unknown as SupabaseClient;
  const { error } = await supabase.from("linkedin_challenge").update({ email_daily: false }).eq("user_id", userId);
  if (error) return page("Une erreur est survenue", "Réessaie dans un instant, ou coupe le mail depuis la page du Défi.", 500);
  return page("C'est fait", "Tu ne recevras plus le mail du matin. Ton rituel et ton pipeline restent actifs ; tu peux réactiver le mail à tout moment.");
}
