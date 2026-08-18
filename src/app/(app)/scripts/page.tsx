const SCRIPTS = [
  {
    guru: "Eric Worre",
    title: "Invitation directe (chaud)",
    body: "« [Prénom], j'ai un projet qui pourrait t'intéresser vu ce que tu m'as dit sur [besoin]. Est-ce que tu es ouvert(e) si je t'envoie 10 minutes de vidéo / si on se voit 20 minutes cette semaine ? »",
  },
  {
    guru: "Art Williams",
    title: "Principe : Faites-le, simplement",
    body: "N'essaie pas d'être parfait. Montre le système, pas ton talent oratoire. Si quelqu'un de simple peut le dupliquer en te regardant faire, ça marche.",
  },
  {
    guru: "Brian Tracy",
    title: "Règle des 3 avant midi",
    body: "Chaque matin : 1 nouveau contact, 1 suivi, 1 action de formation, avant tout le reste.",
  },
  {
    guru: "Jim Rohn",
    title: "La discipline plutôt que la motivation",
    body: "Fixe une heure fixe chaque jour pour ta prospection — même 30 minutes — et ne négocie jamais avec toi-même sur ce rendez-vous.",
  },
  {
    guru: "Tony Robbins",
    title: "État avant stratégie",
    body: "Avant chaque appel important : 60 secondes de respiration, posture, une victoire récente en tête.",
  },
  {
    guru: "Eric Worre",
    title: "Traitement d'objection : « Je n'ai pas le temps »",
    body: "« Je comprends, c'est justement pour ça que ce système existe : il est fait pour des gens occupés. 20 minutes cette semaine, à un moment qui t'arrange ? »",
  },
];

export default function ScriptsPage() {
  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Scripts</h2>
      <p className="mb-4 mt-1 text-xs text-muted">Les 5 piliers de méthode, condensés en action.</p>
      <div className="flex flex-col gap-2.5">
        {SCRIPTS.map((s, i) => (
          <div key={i} className="rounded-2xl border border-line bg-card p-3.5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-ink">{s.title}</div>
              <div className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-night">{s.guru}</div>
            </div>
            <div className="mt-2 text-sm leading-relaxed text-ink">{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
