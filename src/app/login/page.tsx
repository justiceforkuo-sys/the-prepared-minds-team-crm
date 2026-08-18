"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { login, signup, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, undefined);

  const state = mode === "login" ? loginState : signupState;
  const action = mode === "login" ? loginAction : signupAction;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Lock size={22} className="mx-auto mb-2 text-gold" />
          <div className="text-[10px] font-semibold tracking-[2px] text-muted">
            PREPARED MINDS TEAM
          </div>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">CRM</h1>
        </div>

        <div className="mb-4 flex gap-2 rounded-full border border-line bg-card p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm transition ${
              mode === "login" ? "bg-line text-gold-light" : "text-muted"
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm transition ${
              mode === "signup" ? "bg-line text-gold-light" : "text-muted"
            }`}
          >
            Créer un compte
          </button>
        </div>

        <form action={action} className="rounded-2xl border border-line bg-card p-4">
          {mode === "signup" && (
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Utilise l&apos;adresse email que ton sponsor a enregistrée pour toi dans
              le CRM — c&apos;est ce qui relie ton compte à ta fiche existante.
            </p>
          )}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-muted">Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              placeholder="prenom@example.com"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs text-muted">Mot de passe</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              placeholder="••••••••"
            />
          </div>
          {state?.error && (
            <div className="mb-3 text-xs text-red">{state.error}</div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night disabled:opacity-50"
          >
            {pending ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
