import { FileText } from "lucide-react";
import { DISCLAIMER, DOC_SOURCE_LABEL, DOC_TYPE_LABEL, familleLabel, type Solution, type SolutionDocument } from "@/lib/solutions";

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "warn" }) {
  return (
    <div className={`rounded-2xl border bg-card p-3.5 ${tone === "warn" ? "border-gold" : "border-line"}`}>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{title}</div>
      <div className="whitespace-pre-line text-sm text-ink">{children}</div>
    </div>
  );
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" }) : "");

/** Fiche en lecture : ce que lit un collaborateur. Les sections vides ne sont pas affichées. */
export function SolutionView({ solution: s, docs, links, verifierName }: { solution: Solution; docs: SolutionDocument[]; links: Record<string, string>; verifierName: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-xl font-semibold text-ink">{s.nom}</h2>
        <div className="mt-0.5 text-xs text-muted">
          {familleLabel(s.famille)}
          {s.compagnies.length > 0 ? ` · ${s.compagnies.join(", ")}` : ""}
          {!s.publiee && <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[10px]">Brouillon : visible par les responsables seulement</span>}
        </div>
        <div className="mt-1 text-[11px] text-muted">
          {s.verifiee_le ? `Vérifiée le ${fmt(s.verifiee_le)}${verifierName ? ` par ${verifierName}` : ""}` : "Pas encore vérifiée"}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-card px-3 py-2 text-[11px] text-muted">{DISCLAIMER}</div>

      {s.pour_qui && <Section title="Pour qui">{s.pour_qui}</Section>}
      {s.probleme && <Section title="Quel problème elle résout">{s.probleme}</Section>}
      {s.fonctionnement && <Section title="Comment ça marche">{s.fonctionnement}</Section>}
      {s.fiscalite && <Section title={`Avantages fiscaux${s.fiscalite_annee ? ` (année de référence : ${s.fiscalite_annee})` : ""}`}>{s.fiscalite}</Section>}
      {s.conditions && <Section title="Conditions, délais de carence, âges limites">{s.conditions}</Section>}
      {s.exclusions && <Section title="Exclusions">{s.exclusions}</Section>}
      {s.quand_ne_pas_proposer && (
        <Section title="Quand NE PAS la proposer (je protège avant de vendre)" tone="warn">
          {s.quand_ne_pas_proposer}
        </Section>
      )}

      {s.faq.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Questions fréquentes des clients</div>
          <div className="flex flex-col gap-2">
            {s.faq.map((f, i) => (
              <details key={i} className="text-sm">
                <summary className="cursor-pointer font-bold text-ink">{f.q}</summary>
                <div className="mt-1 whitespace-pre-line text-muted">{f.r}</div>
              </details>
            ))}
          </div>
        </div>
      )}

      {(s.modules_fsma.length > 0 || s.liens.length > 0 || s.unites_info) && (
        <div className="rounded-2xl border border-line bg-card p-3.5 text-sm text-ink">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Pour aller plus loin</div>
          {s.modules_fsma.length > 0 && <div>À lire pour les modules : {s.modules_fsma.join(" · ")}</div>}
          {s.liens.map((l, i) => (
            <div key={i}>
              <a href={l.url} target={/^https?:/.test(l.url) ? "_blank" : undefined} rel="noopener noreferrer" className="font-bold text-gold-light underline">
                {l.label}
              </a>
            </div>
          ))}
          {s.unites_info && <div className="mt-1 text-muted">Unités générées : {s.unites_info}</div>}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Documents officiels</div>
        {docs.length === 0 ? (
          <div className="text-xs text-muted">Aucun document déposé pour l&apos;instant.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-start gap-2 text-sm">
                <FileText size={16} className="mt-0.5 flex-shrink-0 text-gold" />
                <div>
                  {links[d.id] ? (
                    <a href={links[d.id]} target="_blank" rel="noopener noreferrer" className="font-bold text-gold-light underline">
                      {d.titre}
                    </a>
                  ) : (
                    <span className="font-bold text-ink">{d.titre}</span>
                  )}
                  <div className="text-[11px] text-muted">
                    {DOC_TYPE_LABEL[d.type]} · {DOC_SOURCE_LABEL[d.source]}
                    {d.source_nom ? ` (${d.source_nom})` : ""}
                    {d.version ? ` · version ${d.version}` : ""}
                    {d.date_version ? ` du ${fmt(d.date_version)}` : ""}
                    {` · déposé le ${fmt(d.depose_le)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
