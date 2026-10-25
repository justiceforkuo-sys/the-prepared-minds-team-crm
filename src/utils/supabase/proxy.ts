import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/activer"];

// Routes ouvertes sans session : appels pg_cron et lien de désinscription (ils vérifient eux-mêmes leur secret /
// leur jeton signé) et la page publique de confidentialité, lisible même connecté. Le proxy les laisse passer telles quelles.
const SELF_AUTHENTICATED_API = [
  "/api/cron/linkedin-ritual",
  "/api/cron/payment-reminders",
  "/api/linkedin/unsubscribe",
  "/api/webhooks/jotform",
  "/api/webhooks/calendly",
  "/api/inbound/linkedin",
];
// Pages publiques lisibles par tous, connectés ou non (formulaire de candidature : le parrain peut prévisualiser son lien)
const OPEN_PAGE_PREFIXES = ["/postuler", "/confidentialite"];
// Connecteur Claude (MCP) : jetons signés vérifiés par les routes elles-mêmes ; la page de consentement /connecter-claude, elle, exige la session.
const SELF_AUTHENTICATED_PREFIXES = ["/api/mcp", "/.well-known/"];

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (SELF_AUTHENTICATED_API.includes(pathname) || SELF_AUTHENTICATED_PREFIXES.some((p) => pathname.startsWith(p)) || OPEN_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
