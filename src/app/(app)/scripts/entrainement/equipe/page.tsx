import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import type { SeanceLigne } from "../actions";
import { SuiviEquipe, type SuiviPersonne } from "./suivi-equipe";

export default async function SuiviEquipePage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  const svc = createServiceClient() as unknown as SupabaseClient;

  // Un administrateur suit tout le monde, un coach sa cascade (tous niveaux).
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

  return (
    <div>
      <Link href="/scripts/entrainement" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={16} /> S&apos;entraîner aux appels
      </Link>
      <h2 className="font-serif text-xl font-semibold text-ink">Suivi des entraînements</h2>
      {suivies.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-line bg-card p-4 text-sm text-muted">Tu n&apos;as pas encore de collaborateur à suivre.</p>
      ) : (
        <Contenu suivies={suivies} svc={svc} />
      )}
    </div>
  );
}

async function Contenu({ suivies, svc }: { suivies: { id: string; name: string }[]; svc: SupabaseClient }) {
  const ids = suivies.map((p) => p.id);
  const seances: SeanceLigne[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await svc
      .from("entrainement_seances")
      .select("id, person_id, scenario_titre, niveau, profil_label, note, rdv_obtenu, created_at")
      .in("person_id", ids)
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    seances.push(...((data as SeanceLigne[] | null) ?? []));
    if (!data || data.length < 1000) break;
  }
  const personnes: SuiviPersonne[] = suivies.map((p) => ({ id: p.id, name: p.name, seances: seances.filter((s) => s.person_id === p.id) }));
  return <SuiviEquipe personnes={personnes} />;
}
