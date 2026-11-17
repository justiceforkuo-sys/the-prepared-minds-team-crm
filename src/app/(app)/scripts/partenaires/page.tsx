import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, PhoneCall } from "lucide-react";
import { A_EVITER, FIL_ROUGE, MOTS_CLES, PHRASES_CLES } from "@/lib/entrainement-partenaires";

export default function PartenairesPage() {
  return (
    <div>
      <Link href="/scripts" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={16} /> Scripts
      </Link>
      <h2 className="font-serif text-xl font-semibold text-ink">Appels aux structures partenaires</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Bureaux de tarification, agences de placement, fédérations : ceux qui connaissent personnellement chaque infirmier et ses revenus. Le fil rouge, les phrases clés et ce qu&apos;il faut éviter, d&apos;après les 8 appels d&apos;entraînement du 17 novembre 2026.
      </p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <Link href="/scripts/entrainement?mode=partenaire" className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 hover:border-gold">
          <PhoneCall size={20} className="flex-shrink-0 text-gold-light" />
          <span className="text-xs text-muted">
            <span className="block text-sm font-bold text-ink">S&apos;entraîner</span>
            Claude joue le responsable d&apos;une structure, tu décroches un rendez-vous.
          </span>
        </Link>
        <Link href="/scripts/partenaires/chasse" className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 hover:border-gold">
          <Building2 size={20} className="flex-shrink-0 text-gold-light" />
          <span className="text-xs text-muted">
            <span className="block text-sm font-bold text-ink">Ma chasse aux partenaires</span>
            Les structures à appeler, les rendez-vous et les confirmations à envoyer.
          </span>
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="text-sm font-bold text-ink">Pour mémoriser : les 5 mots-clés</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {MOTS_CLES.map((m, i) => (
            <span key={m} className="flex items-center gap-1.5">
              <span className="rounded-full bg-gold px-2.5 py-1 text-night">{m}</span>
              {i < MOTS_CLES.length - 1 && <span className="text-muted">→</span>}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Chaque mot te rappelle une étape. Le reste, tu le dis avec tes mots : tout vient du cœur, je protège avant de vendre.</p>
      </div>

      <h3 className="mb-2 text-sm font-bold text-ink">Le fil rouge de l&apos;appel</h3>
      <div className="mb-5 flex flex-col gap-2">
        {FIL_ROUGE.map((e) => (
          <div key={e.etape} className="rounded-2xl border border-line bg-card p-3.5">
            <div className="text-xs font-bold text-ink">
              {e.etape}. {e.titre}
            </div>
            <div className="mt-1 text-sm leading-relaxed text-ink">{e.texte}</div>
          </div>
        ))}
        <p className="text-[11px] text-muted">Cite MonINFI seulement si tu travailles réellement avec eux ; sinon, donne un résultat concret sans nom (« un infirmier vient de mettre en place sa pension et sa protection décès »).</p>
      </div>

      <h3 className="mb-2 text-sm font-bold text-ink">Tes phrases clés, prêtes à l&apos;emploi</h3>
      <div className="mb-5 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="w-2/5 p-2.5 font-bold">Situation</th>
              <th className="p-2.5 font-bold">Ta phrase</th>
            </tr>
          </thead>
          <tbody>
            {PHRASES_CLES.map((p) => (
              <tr key={p.situation} className="border-t border-line align-top text-ink">
                <td className="p-2.5 font-bold">{p.situation}</td>
                <td className="p-2.5">
                  {p.phrase}
                  {p.conformite && <span className="ml-1.5 whitespace-nowrap rounded-full border border-gold px-1.5 py-0.5 text-[10px] font-bold text-gold-light">à faire valider</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 text-sm font-bold text-ink">À éviter</h3>
      <ul className="mb-5 flex flex-col gap-1.5 text-xs text-ink">
        {A_EVITER.map((a) => (
          <li key={a} className="rounded-xl border border-line bg-card p-2.5">
            {a}
          </li>
        ))}
      </ul>

      <div className="flex items-start gap-2 rounded-xl border border-line bg-card p-3 text-xs text-ink">
        <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-gold-light" />
        <span>
          Avant de promettre une commission ou un avantage à une structure, fais-le valider par OVB Willemot (conformité FSMA). Les phrases marquées « à faire valider » concernent le statut et la rémunération : relis-les avec la conformité avant de les diffuser à toute l&apos;équipe.
        </span>
      </div>
    </div>
  );
}
