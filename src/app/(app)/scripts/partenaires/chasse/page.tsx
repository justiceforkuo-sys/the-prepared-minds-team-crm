import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { STATUTS_CHASSE } from "@/lib/entrainement-partenaires";
import { ChasseBoard, type ChasseLigne } from "./chasse-board";

type Brut = Omit<ChasseLigne, "rdv_local" | "rdv_affiche"> & { owner_id: string; rdv_at: string | null };

/** Instant UTC → valeur de champ datetime-local et texte lisible, en heure de Bruxelles. */
function rdvEnBruxelles(iso: string | null): { local: string; affiche: string } {
  if (!iso) return { local: "", affiche: "" };
  const d = new Date(iso);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const hh = p.hour === "24" ? "00" : p.hour;
  return {
    local: `${p.year}-${p.month}-${p.day}T${hh}:${p.minute}`,
    affiche: new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d),
  };
}

export default async function ChassePage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  const svc = createServiceClient() as unknown as SupabaseClient;

  // Personnes suivies : sa cascade (tous niveaux) ; un administrateur suit tout le monde.
  const { data: people } = await svc.from("people").select("id, name, active, reports_to");
  const rows = (people as { id: string; name: string; active: boolean; reports_to: string | null }[] | null) ?? [];
  const kids = new Map<string, string[]>();
  for (const p of rows) if (p.reports_to) kids.set(p.reports_to, [...(kids.get(p.reports_to) ?? []), p.id]);
  const scope = new Set<string>();
  const stack = [me.id];
  while (stack.length) {
    for (const k of kids.get(stack.pop()!) ?? []) {
      if (scope.has(k)) continue;
      scope.add(k);
      stack.push(k);
    }
  }
  const suivies = rows.filter((p) => p.active && p.id !== me.id && (me.is_admin || scope.has(p.id)));

  const { data, error } = await svc
    .from("partenaires_chasse")
    .select("id, owner_id, nom, type, zone, statut, contact_nom, contact_tel, contact_email, rdv_at, rdv_format, rdv_lieu, confirmation_envoyee, dernier_appel, nb_appels, notes")
    .in("owner_id", [me.id, ...suivies.map((p) => p.id)]);

  const entete = (
    <>
      <Link href="/scripts/partenaires" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={16} /> Appels aux structures partenaires
      </Link>
      <h2 className="font-serif text-xl font-semibold text-ink">Chasse aux partenaires</h2>
    </>
  );

  if (error) {
    return (
      <div>
        {entete}
        <p className="mt-3 rounded-2xl border border-line bg-card p-4 text-sm text-muted">
          Le suivi de la chasse n&apos;est pas encore activé : la migration 070 doit être exécutée dans Supabase (SQL Editor).
        </p>
      </div>
    );
  }

  const tous = (data as Brut[] | null) ?? [];
  const miennes: ChasseLigne[] = tous
    .filter((l) => l.owner_id === me.id)
    .map((l) => {
      const r = rdvEnBruxelles(l.rdv_at);
      return { ...l, rdv_local: r.local, rdv_affiche: r.affiche };
    });

  const equipe = suivies
    .map((p) => {
      const mes = tous.filter((l) => l.owner_id === p.id);
      const n = (s: string) => mes.filter((l) => l.statut === s).length;
      return { id: p.id, name: p.name, total: mes.length, appeles: mes.filter((l) => l.nb_appels > 0).length, rdv: n("rdv_fixe"), rencontres: n("rencontre"), partenaires: n("partenaire") };
    })
    .filter((p) => p.total > 0);

  return (
    <div>
      {entete}
      <p className="mb-3 mt-1 text-xs text-muted">
        Une ligne par structure qui travaille avec des infirmiers et aides-soignants indépendants. Coordonnées professionnelles uniquement (jamais d&apos;infirmier ni de client). Ta hiérarchie peut relire ta liste. Une commission ou un avantage pour une structure se fait valider par OVB Willemot (conformité FSMA) avant d&apos;en parler.
      </p>
      <ChasseBoard lignes={miennes} />

      {equipe.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-bold text-ink">Chasse de l&apos;équipe</h3>
          <div className="overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="p-2.5 font-bold">Collaborateur</th>
                  <th className="p-2.5 font-bold">Structures</th>
                  <th className="p-2.5 font-bold">Appelées</th>
                  <th className="p-2.5 font-bold">RDV fixés</th>
                  <th className="p-2.5 font-bold">Rencontrées</th>
                  <th className="p-2.5 font-bold">Partenaires</th>
                </tr>
              </thead>
              <tbody>
                {equipe.map((p) => (
                  <tr key={p.id} className="border-t border-line text-ink">
                    <td className="p-2.5 font-bold">{p.name}</td>
                    <td className="p-2.5">{p.total}</td>
                    <td className="p-2.5">{p.appeles}</td>
                    <td className="p-2.5">{p.rdv}</td>
                    <td className="p-2.5">{p.rencontres}</td>
                    <td className="p-2.5">{p.partenaires}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Statuts : {STATUTS_CHASSE.map((s) => s.label).join(" → ")}.</p>
        </div>
      )}
    </div>
  );
}
