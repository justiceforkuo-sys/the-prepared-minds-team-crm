import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, PhoneCall } from "lucide-react";
import { A_EVITER, MOTS_CLES, TYPES_STRUCTURE } from "@/lib/entrainement-partenaires";
import { APRES_APPEL, FAMILLES_OBJECTIONS, PRINCIPES_COMMUNS, REGLES_OR, SCRIPTS_PARTENAIRES, SCRIPT_PAR_TYPE, type ObjectionPartenaire } from "@/lib/scripts-partenaires";

function Tableau({ lignes }: { lignes: (ObjectionPartenaire & { testee?: boolean })[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full text-left text-xs">
        <thead className="text-muted">
          <tr>
            <th className="w-2/5 p-2.5 font-bold">Ils disent</th>
            <th className="p-2.5 font-bold">Tu réponds</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((o) => (
            <tr key={o.ils_disent} className="border-t border-line align-top text-ink">
              <td className="p-2.5 font-bold">{o.ils_disent}</td>
              <td className="p-2.5">
                {o.tu_reponds}
                {o.testee && <span className="ml-1.5 whitespace-nowrap rounded-full border border-line px-1.5 py-0.5 text-[10px] font-bold text-muted" title="Réponse jouée avec succès dans les entraînements du 17 novembre">★ testée en entraînement</span>}
                {o.conformite && <span className="ml-1.5 whitespace-nowrap rounded-full border border-gold px-1.5 py-0.5 text-[10px] font-bold text-gold-light">à faire valider</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PartenairesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type: typeParam } = await searchParams;
  const script = SCRIPT_PAR_TYPE.get(typeParam ?? "") ?? SCRIPTS_PARTENAIRES[0];
  const etapes = [
    { n: "1", titre: "Ouverture", texte: script.ouverture },
    { n: "2", titre: "La raison", texte: script.raison },
    { n: "3", titre: "La question", texte: `${script.question} Puis tu te tais.` },
    { n: "4", titre: "La proposition", texte: script.proposition },
    { n: "5", titre: "Le rendez-vous", texte: script.rdv },
  ];

  return (
    <div>
      <Link href="/scripts" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={16} /> Scripts
      </Link>
      <h2 className="font-serif text-xl font-semibold text-ink">Appels aux partenaires</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Un appel partenaire a un seul but : décrocher un rendez-vous de 20 minutes. On ne vend rien au téléphone, on vient protéger les gens qu&apos;ils accompagnent. Le même chemin en 5 étapes pour tous, adapté à chaque type de partenaire.
      </p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <Link href={`/scripts/entrainement?mode=partenaire&type=${script.type}`} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 hover:border-gold">
          <PhoneCall size={20} className="flex-shrink-0 text-gold-light" />
          <span className="text-xs text-muted">
            <span className="block text-sm font-bold text-ink">S&apos;entraîner : {script.titre.toLowerCase()}</span>
            Claude joue le décideur, tu décroches un rendez-vous.
          </span>
        </Link>
        <Link href="/scripts/partenaires/chasse" className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 hover:border-gold">
          <Building2 size={20} className="flex-shrink-0 text-gold-light" />
          <span className="text-xs text-muted">
            <span className="block text-sm font-bold text-ink">Ma chasse aux partenaires</span>
            Les contacts à appeler, les rendez-vous, les relances et le mail de confirmation.
          </span>
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="text-sm font-bold text-ink">Principes communs : les 5 mots-clés</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {MOTS_CLES.map((m, i) => (
            <span key={m} className="flex items-center gap-1.5">
              <span className="rounded-full bg-gold px-2.5 py-1 text-night">{m}</span>
              {i < MOTS_CLES.length - 1 && <span className="text-muted">→</span>}
            </span>
          ))}
        </div>
        <ul className="mt-2 flex flex-col gap-1 text-xs text-ink">
          {PRINCIPES_COMMUNS.map((p) => (
            <li key={p.mot}>
              <strong>{p.mot}</strong> · {p.etape} : <span className="text-muted">{p.action}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-sm font-bold text-ink">Règles d&apos;or</div>
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-xs text-ink">
          {REGLES_OR.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
        {SCRIPTS_PARTENAIRES.map((s) => (
          <Link key={s.type} href={`/scripts/partenaires?type=${s.type}`} className={`rounded-full border px-2.5 py-1 ${script.type === s.type ? "border-gold bg-gold text-night" : "border-line text-muted"}`}>
            {TYPES_STRUCTURE.find((t) => t.id === s.type)?.label ?? s.titre}
          </Link>
        ))}
      </div>

      <h3 className="mb-1 text-sm font-bold text-ink">{script.titre}</h3>
      <p className="mb-3 rounded-xl border border-line bg-card p-2.5 text-xs text-muted">
        <strong className="text-ink">L&apos;angle.</strong> {script.angle}
      </p>
      {script.avant && (
        <p className="mb-3 rounded-xl border border-line bg-card p-2.5 text-xs text-muted">
          <strong className="text-ink">Ce qu&apos;il te faut avant d&apos;appeler.</strong> {script.avant}
        </p>
      )}
      <div className="mb-3 flex flex-col gap-2">
        {etapes.map((e) => (
          <div key={e.n} className="rounded-2xl border border-line bg-card p-3.5">
            <div className="text-xs font-bold text-ink">
              {e.n}. {e.titre}
            </div>
            <div className="mt-1 text-sm leading-relaxed text-ink">{e.texte}</div>
          </div>
        ))}
      </div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Objections propres à ce partenaire</h4>
      <Tableau lignes={script.objections} />
      {script.astuce && (
        <p className="mt-2 rounded-xl border border-line bg-card p-2.5 text-xs text-ink">
          <strong>À savoir.</strong> {script.astuce}
        </p>
      )}

      <h3 className="mb-1 mt-6 text-sm font-bold text-ink">Objections communes</h3>
      <p className="mb-2 text-xs text-muted">
        Une objection n&apos;est pas un non : c&apos;est une question. Réponds toujours en 3 temps : accueillir (« Je comprends », « Très bien »), répondre en une phrase, relancer par une question ou par les deux créneaux. Les réponses ★ ont été jouées avec succès dans les entraînements du 17 novembre (des jeux de rôle avec Claude, pas des appels réels).
      </p>
      <div className="mb-5 flex flex-col gap-2">
        {FAMILLES_OBJECTIONS.map((f) => (
          <details key={f.titre} className="rounded-2xl border border-line bg-card p-3">
            <summary className="cursor-pointer text-sm font-bold text-ink">
              {f.titre} ({f.objections.length})
            </summary>
            <div className="mt-2">
              <Tableau lignes={f.objections} />
            </div>
          </details>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-bold text-ink">À éviter</h3>
      <ul className="mb-5 flex flex-col gap-1.5 text-xs text-ink">
        {A_EVITER.map((a) => (
          <li key={a} className="rounded-xl border border-line bg-card p-2.5">
            {a}
          </li>
        ))}
      </ul>

      <h3 className="mb-2 text-sm font-bold text-ink">Après l&apos;appel</h3>
      <ul className="mb-5 flex list-disc flex-col gap-1 pl-4 text-xs text-ink">
        {APRES_APPEL.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <div className="flex items-start gap-2 rounded-xl border border-line bg-card p-3 text-xs text-ink">
        <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-gold-light" />
        <span>
          Avant de promettre une commission ou un avantage à un partenaire, fais-le valider par OVB Willemot (conformité FSMA). Les phrases marquées « à faire valider » concernent le statut, la rémunération ou l&apos;échange de clients : relis-les avec la conformité avant de les diffuser à toute l&apos;équipe. Cite un partenaire de référence seulement s&apos;il est réel, et un résultat concret seulement s&apos;il est vrai.
        </span>
      </div>
    </div>
  );
}
