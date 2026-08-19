"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { submitApplication, type SubmitState } from "./actions";

export function PostulerForm({ slug, recruiterName }: { slug: string; recruiterName: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitApplication.bind(null, slug),
    undefined
  );

  if (state?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Lock size={22} className="mx-auto mb-2 text-gold" />
          <h1 className="font-serif text-xl font-semibold text-ink">Merci !</h1>
          <p className="mt-2 text-sm text-muted">
            Ta candidature a bien été envoyée à {recruiterName}. On te recontacte bientôt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Lock size={22} className="mx-auto mb-2 text-gold" />
          <div className="text-[10px] font-semibold tracking-[2px] text-muted">
            PREPARED MINDS TEAM
          </div>
          <h1 className="mt-1 font-serif text-xl font-semibold text-ink">
            Candidature — Directeur d&apos;agence
          </h1>
          <p className="mt-2 text-xs text-muted">
            Formulaire de pré-qualification transmis par {recruiterName}.
          </p>
        </div>

        <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Nom complet</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Téléphone</label>
            <input
              name="phone"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Email</label>
            <input
              name="email"
              type="email"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Date de naissance</label>
            <input
              name="birthdate"
              type="date"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Nationalité</label>
            <input
              name="nationality"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Situation professionnelle actuelle</label>
            <input
              name="current_situation"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink">
            <input name="has_cess" type="checkbox" />
            Je possède le CESS (ou équivalent)
          </label>
          <label className="flex items-start gap-2 text-xs text-ink">
            <input name="availability_confirmed" type="checkbox" className="mt-0.5" />
            Je confirme être disponible lundi 19h-21h, jeudi 19h-21h et samedi 11h-13h
          </label>
          <div>
            <label className="mb-1 block text-xs text-muted">Niveau de français</label>
            <input
              name="french_level"
              placeholder="Débutant / Intermédiaire / Courant"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Niveau d&apos;anglais</label>
            <input
              name="english_level"
              placeholder="Débutant / Intermédiaire / Courant"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              Comment as-tu entendu parler de cette opportunité ?
            </label>
            <input
              name="referral_source"
              className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>

          {state?.error && <div className="text-xs text-red">{state.error}</div>}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 w-full rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night disabled:opacity-50"
          >
            {pending ? "..." : "Envoyer ma candidature"}
          </button>
        </form>
      </div>
    </div>
  );
}
