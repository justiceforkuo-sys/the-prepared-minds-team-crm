"use client";

import { useActionState } from "react";
import Link from "next/link";
import Script from "next/script";
import { CheckCircle2, Lock } from "lucide-react";
import { submitApplication, type SubmitState } from "./actions";
import { ELIGIBILITY_OPTIONS, HOURS_OPTIONS, INCOME_OPTIONS, LEVEL_OPTIONS, REFERRAL_OPTIONS, SITUATION_OPTIONS } from "@/lib/recruitment";

const field = "w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold";
const labelCls = "mb-1 block text-xs text-muted";

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        {n} {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Choices({
  name,
  options,
  value,
  required,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  value?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o, i) => (
        <label key={o.value} className="flex items-start gap-2 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink">
          <input type="radio" name={name} value={o.value} defaultChecked={value === o.value} required={required && i === 0} className="mt-0.5" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function PostulerForm({
  slug,
  sponsorFirstName,
  slots,
}: {
  slug: string;
  sponsorFirstName: string;
  slots: string[];
}) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitApplication.bind(null, slug), undefined);
  const result = state?.result;
  const v = (k: string) => state?.values?.[k] ?? "";

  if (result?.kind === "ok") {
    return (
      <div className="mx-auto min-h-screen w-full max-w-xl px-4 py-8">
        <div className="mb-4 text-center">
          <CheckCircle2 size={26} className="mx-auto mb-2 text-gold" />
          <h1 className="font-serif text-xl font-semibold text-ink">Merci {result.firstName} !</h1>
          <p className="mt-1.5 text-sm text-muted">
            {result.interviewUrl
              ? "Réserve ton entretien de 30 minutes maintenant."
              : `${result.recruiterName} te recontacte sous 24 à 48 heures pour fixer ton entretien.`}
          </p>
          <p className="mt-1 text-xs text-muted">Un email de confirmation vient de t&apos;être envoyé.</p>
        </div>
        {result.interviewUrl && (
          <>
            <div className="calendly-inline-widget overflow-hidden rounded-2xl border border-line" data-url={result.interviewUrl} style={{ minWidth: 320, height: 720 }} />
            <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" />
            <p className="mt-2 text-center text-xs text-muted">
              Le calendrier ne s&apos;affiche pas ?{" "}
              <a href={result.interviewUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-gold-light underline">
                Ouvre-le dans un nouvel onglet
              </a>
              .
            </p>
          </>
        )}
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Lock size={22} className="mx-auto mb-2 text-gold" />
          <h1 className="font-serif text-xl font-semibold text-ink">Merci {result.firstName}</h1>
          <p className="mt-2 text-sm text-muted">{result.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-xl px-4 py-8">
      <div className="mb-5 text-center">
        <div className="text-[10px] font-semibold tracking-[2px] text-muted">PREPARED MINDS TEAM</div>
        <h1 className="mt-1 font-serif text-xl font-semibold text-ink">
          Rejoins Prepared Minds Team — deviens conseiller financier et construis ton équipe
        </h1>
        <p className="mt-3 text-left text-sm leading-relaxed text-muted">
          Prepared Minds Team accompagne les indépendants et les professionnels de santé dans leur protection, leur épargne et leur fiscalité, sous OVB Willemot.
          Tu démarres comme conseiller indépendant, formé et accompagné par un parrain. Tu es rémunéré à la commission. Tu peux commencer à côté de tes études ou de
          ton travail, et construire ton équipe à ton rythme. Le formulaire prend 3 minutes.
        </p>
        <p className="mt-2 text-xs text-muted">Formulaire transmis par {sponsorFirstName}</p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <Section n="①" title="Toi">
          <div>
            <label className={labelCls}>Nom complet</label>
            <input name="name" required defaultValue={v("name")} autoComplete="name" className={field} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Téléphone</label>
              <input name="phone" type="tel" required defaultValue={v("phone")} autoComplete="tel" placeholder="+32 4xx xx xx xx" className={field} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input name="email" type="email" required defaultValue={v("email")} autoComplete="email" className={field} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Ville</label>
              <input name="city" defaultValue={v("city")} autoComplete="address-level2" className={field} />
            </div>
            <div>
              <label className={labelCls}>Date de naissance</label>
              <input name="birthdate" type="date" required defaultValue={v("birthdate")} autoComplete="bday" className={field} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Éligibilité (exigence de l&apos;entreprise)</label>
            <Choices
              name="eligibility"
              required
              value={v("eligibility")}
              options={ELIGIBILITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <div>
            <label className={labelCls}>Situation actuelle</label>
            <select name="current_situation" defaultValue={v("current_situation")} className={field}>
              <option value="">Choisir…</option>
              {SITUATION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>CESS ou équivalent</label>
            <Choices
              name="has_cess"
              value={v("has_cess")}
              options={[
                { value: "oui", label: "Oui" },
                { value: "non", label: "Non" },
              ]}
            />
          </div>
        </Section>

        <Section n="②" title="Ton projet">
          <div>
            <label className={labelCls}>Pourquoi cette opportunité t&apos;intéresse ?</label>
            <textarea name="motivation" required rows={3} defaultValue={v("motivation")} className={field} />
          </div>
          <div>
            <label className={labelCls}>Combien d&apos;heures par semaine peux-tu y consacrer ?</label>
            <Choices name="hours_per_week" required value={v("hours_per_week")} options={HOURS_OPTIONS} />
          </div>
          <div>
            <label className={labelCls}>As-tu une expérience de vente, de service client ou de contact avec le public ?</label>
            <Choices
              name="sales_experience"
              value={v("sales_experience")}
              options={[
                { value: "oui", label: "Oui" },
                { value: "non", label: "Non" },
              ]}
            />
            <input name="sales_experience_note" defaultValue={v("sales_experience_note")} placeholder="Une ligne pour préciser (facultatif)" className={`${field} mt-2`} />
          </div>
          <div>
            <label className={labelCls}>Ton objectif de revenu complémentaire dans 12 mois ?</label>
            <Choices name="income_goal" value={v("income_goal")} options={INCOME_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} par mois` }))} />
          </div>
        </Section>

        <Section n="③" title="Langues et formation">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { name: "french_level", label: "Français" },
              { name: "english_level", label: "Anglais" },
              { name: "dutch_level", label: "Néerlandais" },
            ].map((l) => (
              <div key={l.name}>
                <label className={labelCls}>{l.label}</label>
                <select name={l.name} defaultValue={v(l.name)} className={field}>
                  <option value="">Choisir…</option>
                  {LEVEL_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {slots.length > 0 && (
            <label className="flex items-start gap-2 text-sm text-ink">
              <input name="availability_confirmed" type="checkbox" defaultChecked={v("availability_confirmed") === "on"} className="mt-1" />
              Je confirme pouvoir suivre la formation aux créneaux suivants : {slots.join(", ")}
            </label>
          )}
        </Section>

        <Section n="④" title="Consentement">
          <div>
            <label className={labelCls}>Comment as-tu connu l&apos;opportunité ?</label>
            <select name="referral_source" defaultValue={v("referral_source")} className={field}>
              <option value="">Choisir…</option>
              {REFERRAL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input name="consent" type="checkbox" required defaultChecked={v("consent") === "on"} className="mt-1" />
            <span>
              J&apos;accepte que Prepared Minds Team utilise ces informations pour étudier ma candidature et me recontacter. Elles ne sont jamais transmises à des tiers et
              sont supprimées après 12 mois sans suite.{" "}
              <Link href="/confidentialite" target="_blank" className="font-bold text-gold-light underline">
                Confidentialité
              </Link>
            </span>
          </label>
        </Section>

        {state?.error && <div className="rounded-lg border border-red px-3 py-2 text-sm text-red">{state.error}</div>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gold px-4 py-3 text-sm font-bold text-night disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Envoyer ma candidature"}
        </button>
      </form>
    </div>
  );
}
