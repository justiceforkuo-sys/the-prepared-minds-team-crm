"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

function ActiverContent() {
  const searchParams = useSearchParams();
  const to = searchParams.get("to");
  const target = to ? decodeURIComponent(to) : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Lock size={22} className="mx-auto mb-2 text-gold" />
          <div className="text-[10px] font-semibold tracking-[2px] text-muted">
            PREPARED MINDS TEAM
          </div>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">
            Activer mon compte
          </h1>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 text-center">
          {target ? (
            <>
              <p className="mb-4 text-xs leading-relaxed text-muted">
                Clique sur le bouton ci-dessous pour définir ton mot de passe.
                Ce lien est personnel et à usage unique.
              </p>
              <button
                onClick={() => {
                  window.location.href = target;
                }}
                className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night"
              >
                Créer mon mot de passe
              </button>
            </>
          ) : (
            <p className="text-xs text-red">Lien invalide.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActiverPage() {
  return (
    <Suspense>
      <ActiverContent />
    </Suspense>
  );
}
