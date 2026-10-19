export const metadata = { title: "Confidentialité — Prepared Minds Team" };

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-xl px-4 py-8">
      <div className="mb-5">
        <div className="text-[10px] font-semibold tracking-[2px] text-muted">PREPARED MINDS TEAM</div>
        <h1 className="mt-1 font-serif text-xl font-semibold text-ink">Confidentialité de ta candidature</h1>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="mb-1 font-bold">Qui reçoit tes informations ?</h2>
          <p className="text-muted">
            Prepared Minds Team, équipe de conseillers indépendants travaillant sous OVB Willemot. Ta candidature est lue par la personne qui t&apos;a transmis le
            formulaire (ton futur parrain) et par les responsables de l&apos;équipe qui l&apos;accompagnent.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-bold">Pourquoi ?</h2>
          <p className="text-muted">
            Uniquement pour étudier ta candidature et te recontacter (téléphone, email), notamment pour fixer un entretien. Nous vérifions aussi les conditions exigées
            par l&apos;entreprise : âge minimum de 21 ans et situation d&apos;éligibilité.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-bold">Qui n&apos;y a pas accès ?</h2>
          <p className="text-muted">
            Tes informations ne sont jamais vendues ni transmises à des tiers à des fins commerciales. Elles sont conservées dans l&apos;outil interne de l&apos;équipe, dont
            l&apos;accès est protégé.
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-bold">Combien de temps ?</h2>
          <p className="text-muted">Elles sont supprimées après 12 mois sans suite. Si tu rejoins l&apos;équipe, elles deviennent ta fiche de collaborateur.</p>
        </section>
        <section>
          <h2 className="mb-1 font-bold">Tes droits</h2>
          <p className="text-muted">
            Tu peux demander à tout moment l&apos;accès à tes informations, leur correction ou leur suppression, en écrivant à la personne qui t&apos;a transmis le
            formulaire. Tu peux aussi introduire une réclamation auprès de l&apos;Autorité de protection des données (autoriteprotectiondonnees.be).
          </p>
        </section>
      </div>

      <div className="mt-4 text-center text-xs text-muted">Tu peux fermer cet onglet pour revenir à ton formulaire.</div>
    </div>
  );
}
