import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { equipeDe } from "@/lib/equipe";
import { aujourdhuiBxl, type RapportRow } from "@/lib/rapport-hebdo-gen";
import { addDays } from "@/lib/parcours";
import { collecterFaits, evaluer, type PersonneRapport } from "@/lib/rapport-hebdo";
import type { Ligne } from "@/lib/rapport-hebdo-format";
import { RapportsView, type EquipeLigne } from "./rapports-view";

// La préparation d'un rapport (Claude) peut prendre quelques secondes par personne.
export const maxDuration = 120;

export default async function RapportsPage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  const svc = createServiceClient() as unknown as SupabaseClient;
  const today = aujourdhuiBxl();

  // Mes rapports publiés
  const { data: mine } = await svc.from("rapports_hebdo").select("*").eq("person_id", me.id).eq("statut", "envoye").order("semaine", { ascending: false }).limit(12);
  const mesRapports = (mine as RapportRow[] | null) ?? [];

  // Où j'en suis cette semaine par rapport aux tâches du dernier rapport
  let progres: Ligne[] | null = null;
  if (mesRapports[0]) {
    const p: PersonneRapport = { id: me.id, name: me.name, email: me.email ?? null, rank: me.rank, integration_date: (me as { integration_date?: string | null }).integration_date ?? null, reports_to: me.reports_to ?? null };
    const faits = await collecterFaits(svc, p, addDays(mesRapports[0].semaine, 1), today);
    progres = evaluer(mesRapports[0].taches, faits);
  }

  // Équipe : administrateur = tout le monde, coach = sa cascade
  const scope = await equipeDe(svc, me.id);
  const { data: people } = await svc.from("people").select("id, name, rank, rapport_hebdo, active").eq("active", true).order("name");
  const suivis = ((people as { id: string; name: string; rank: string; rapport_hebdo: boolean }[] | null) ?? []).filter((x) => x.id !== me.id && (me.is_admin || scope.has(x.id)) && (x.rapport_hebdo || me.is_admin));
  let equipe: EquipeLigne[] | null = null;
  if (me.is_admin || scope.size > 0) {
    const ids = suivis.map((x) => x.id);
    const { data: reps } = ids.length
      ? await svc.from("rapports_hebdo").select("*").in("person_id", ids).neq("statut", "ignore").order("semaine", { ascending: false }).limit(400)
      : { data: [] };
    const rows = (reps as RapportRow[] | null) ?? [];
    equipe = suivis.map((x) => ({
      personId: x.id,
      name: x.name,
      rank: x.rank,
      suivi: x.rapport_hebdo,
      aValider: rows.filter((r) => r.person_id === x.id && r.statut === "a_valider"),
      dernier: rows.find((r) => r.person_id === x.id && r.statut === "envoye") ?? null,
    }));
  }

  return <RapportsView prenom={me.name} mesRapports={mesRapports} progres={progres} equipe={equipe} isAdmin={!!me.is_admin} today={today} />;
}
