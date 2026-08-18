"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // Les liens d'invitation/récupération générés côté admin utilisent le flux
    // implicite (tokens dans le fragment d'URL), pas le flux PKCE que le client
    // détecte automatiquement — on doit donc les lire et les appliquer nous-mêmes.
    async function init() {
      try {
        const hash = window.location.hash;
        if (hash.length > 1) {
          const params = new URLSearchParams(hash.slice(1));
          const errorDescription = params.get("error_description");
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          window.history.replaceState(null, "", window.location.pathname);

          if (errorDescription) {
            setError(
              `${decodeURIComponent(errorDescription.replace(/\+/g, " "))} — redemande un nouveau lien.`
            );
            return;
          }
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) setError(`${error.message} — redemande un nouveau lien.`);
            else setReady(true);
            return;
          }
        }
        const { data } = await supabase.auth.getSession();
        if (data.session) setReady(true);
        else setError("Lien invalide ou expiré. Redemande un nouveau lien.");
      } catch {
        setError("Une erreur est survenue à l'ouverture du lien. Redemande un nouveau lien.");
      }
    }
    init();
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Session expirée. Redemande un nouveau lien.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
    } catch {
      setError("Une erreur est survenue. Réessaie, ou redemande un nouveau lien.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Lock size={22} className="mx-auto mb-2 text-gold" />
          <div className="text-[10px] font-semibold tracking-[2px] text-muted">
            PREPARED MINDS TEAM
          </div>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">
            Nouveau mot de passe
          </h1>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-line bg-card p-4">
          {!ready && (
            <p className="mb-3 text-xs text-muted">
              Ouverture du lien en cours…
            </p>
          )}
          <div className="mb-4">
            <label className="mb-1 block text-xs text-muted">Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="mb-3 text-xs text-red">{error}</div>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night disabled:opacity-50"
          >
            {pending ? "..." : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
