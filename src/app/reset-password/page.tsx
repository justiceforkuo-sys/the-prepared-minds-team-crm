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
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
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
            disabled={pending || !ready}
            className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night disabled:opacity-50"
          >
            {pending ? "..." : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
