"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/utils/supabase/client";

// Statut professionnel choisi par chaque personne dans Finances (aucun autre accès : ni mentor, ni administrateur).
// Il propose les bonnes colonnes de revenus au départ et rappelle que les hypothèses fiscales par défaut sont à confirmer.
// Aucune règle légale n'est appliquée automatiquement : les taux restent ceux que la personne règle elle-même.

export type StatutPro = "principal" | "complementaire" | "etudiant";

export const STATUTS: { id: StatutPro; label: string; hint: string; sources: string[] }[] = [
  { id: "principal", label: "Indépendant à titre principal", hint: "Temps plein : ton activité indépendante est ton activité principale.", sources: ["Commissions OVB"] },
  { id: "complementaire", label: "Indépendant complémentaire", hint: "Tu as un autre emploi (salarié) à côté de ton activité indépendante.", sources: ["Salaire", "Commissions OVB"] },
  { id: "etudiant", label: "Étudiant indépendant", hint: "Tu étudies en parallèle de ton activité indépendante.", sources: ["Job étudiant", "Commissions OVB"] },
];

export function StatutSection({
  personId,
  initialStatut,
  sources,
  setSources,
  setEstim,
}: {
  personId: string;
  initialStatut: StatutPro | null;
  sources: string[];
  setSources: Dispatch<SetStateAction<string[]>>;
  setEstim: Dispatch<SetStateAction<string[]>>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [statut, setStatut] = useState<StatutPro | null>(initialStatut);
  const [editing, setEditing] = useState(initialStatut === null);
  const [msg, setMsg] = useState<string | null>(null);

  const choose = async (next: StatutPro) => {
    const { error } = await supabase.from("financial_settings").upsert({ person_id: personId, statut_pro: next }, { onConflict: "person_id" });
    if (error) return setMsg(error.message);
    setStatut(next);
    setEditing(false);
    setMsg(null);
    // Première fois : on propose les colonnes de revenus qui vont avec le statut (modifiables ensuite)
    if (sources.length === 0) {
      const base = STATUTS.find((s) => s.id === next)!.sources;
      // Les commissions comptent dans l'estimation d'impôt ; un salaire ou un job étudiant, non (cases modifiables ensuite)
      const independant = (nom: string) => /ovb|commission/i.test(nom);
      const { error: e2 } = await supabase.from("finance_revenus_sources").insert(base.map((nom, ordre) => ({ person_id: personId, nom, ordre, independant: independant(nom) })));
      if (!e2) {
        setSources(base);
        setEstim(base.filter(independant));
      }
    }
  };

  const current = STATUTS.find((s) => s.id === statut);

  return (
    <div className="mb-4 rounded-2xl border border-line bg-card p-3.5">
      {!editing && current ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted">
            Ton statut : <strong className="text-ink">{current.label}</strong>
          </span>
          <button onClick={() => setEditing(true)} className="font-bold text-gold-light">
            Modifier
          </button>
        </div>
      ) : (
        <>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Ton statut professionnel</div>
          <div className="mt-1 text-xs text-muted">Choisis celui qui te correspond : il adapte les colonnes de revenus proposées. Tu es seul à le voir.</div>
          <div className="mt-2 flex flex-col gap-1.5">
            {STATUTS.map((s) => (
              <button key={s.id} onClick={() => choose(s.id)} className={`rounded-xl border bg-card-alt p-2.5 text-left text-xs ${statut === s.id ? "border-gold" : "border-line"}`}>
                <div className="font-bold text-ink">{s.label}</div>
                <div className="text-muted">{s.hint}</div>
              </button>
            ))}
          </div>
          {statut && (
            <button onClick={() => setEditing(false)} className="mt-2 text-xs text-muted">
              Annuler
            </button>
          )}
        </>
      )}
      {statut && statut !== "principal" && !editing && (
        <div className="mt-2 text-[11px] text-muted">
          Les hypothèses fiscales et sociales par défaut (cotisations, impôt) sont celles d&apos;un indépendant à titre principal : règle-les dans « Hypothèses fiscales &amp; sociales » et fais-les valider par ton secrétariat social. Ton salaire n&apos;est pas compté dans l&apos;estimation d&apos;impôt de cette page.
        </div>
      )}
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}
