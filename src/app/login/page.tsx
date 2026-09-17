"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { login, signup, forgotPassword, type AuthState, type ForgotPasswordState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, undefined);
  const [forgotState, forgotAction, forgotPending] = useActionState<ForgotPasswordState, FormData>(
    forgotPassword,
    undefined
  );

  const state = mode === "login" ? loginState : mode === "signup" ? signupState : forgotState;
  const action = mode === "login" ? loginAction : mode === "signup" ? signupAction : forgotAction;
  const pending = mode === "login" ? loginPending : mode === "signup" ? signupPending : forgotPending;

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

        {mode !== "forgot" && (
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
        )}

        {mode === "forgot" && forgotState?.sent ? (
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-sm text-ink">
              Si cette adresse est enregistrée dans le CRM, un email vient de t&apos;être
              envoyé avec un lien pour choisir un nouveau mot de passe.
            </p>
            <button
              onClick={() => setMode("login")}
              className="mt-3 text-xs font-bold text-gold-light"
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form action={action} className="rounded-2xl border border-line bg-card p-4">
            {mode === "signup" && (
              <p className="mb-3 text-xs leading-relaxed text-muted">
                Utilise l&apos;adresse email que ton sponsor a enregistrée pour toi dans
                le CRM — c&apos;est ce qui relie ton compte à ta fiche existante.
              </p>
            )}
            {mode === "forgot" && (
              <p className="mb-3 text-xs leading-relaxed text-muted">
                Renseigne ton email, on t&apos;envoie un lien pour choisir un nouveau
                mot de passe.
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
            {mode !== "forgot" && (
              <div className="mb-1">
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
            )}
            {mode === "login" && (
              <div className="mb-3 text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-muted underline-offset-2 hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}
            {mode !== "login" && <div className="mb-3" />}
            {state?.error && (
              <div className="mb-3 text-xs text-red">{state.error}</div>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night disabled:opacity-50"
            >
              {pending
                ? "..."
                : mode === "login"
                  ? "Se connecter"
                  : mode === "signup"
                    ? "Créer mon compte"
                    : "Envoyer le lien"}
            </button>
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="mt-2 w-full text-center text-xs text-muted"
              >
                Retour à la connexion
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
