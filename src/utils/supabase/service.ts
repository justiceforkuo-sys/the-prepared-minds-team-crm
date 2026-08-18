import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Client "service role" : contourne la RLS. Réservé aux routes serveur qui
// n'ont pas de session utilisateur (ex. webhooks externes) — ne jamais
// importer ce fichier dans un composant client ni exposer la clé au navigateur.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
