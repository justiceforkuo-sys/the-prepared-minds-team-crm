import type { LinkedinSprint, Prospect } from "@/types/database";

export interface SprintFrontCounts {
  contacts: number;
  echanges: number;
  rdv: number;
  dossiers: number;
}

export interface SprintPrescripteurCounts {
  contacts: number;
  echanges: number;
  misesEnRelation: number;
  leads: number;
}

export interface SprintCounts {
  recrutement: SprintFrontCounts;
  client: SprintFrontCounts;
  prescripteur: SprintPrescripteurCounts;
}

// Logique partagée entre le panneau Sprint du collaborateur (Prospects) et le
// suivi équipe (Admin) — les deux doivent toujours compter de la même façon.
export function computeSprintCounts(sprint: LinkedinSprint, prospects: Prospect[]): SprintCounts {
  const inWindow = (p: Prospect) => p.created_at.slice(0, 10) >= sprint.date_debut && p.created_at.slice(0, 10) <= sprint.date_fin;
  const forCategory = (cat: "client" | "recrutement" | "prescripteur") =>
    prospects.filter((p) => p.category === cat && inWindow(p));

  const build = (cat: "client" | "recrutement"): SprintFrontCounts => {
    const list = forCategory(cat);
    const echanges = list.filter((p) => ["Répondu", "RDV pris", "Entretien / Dossier"].includes(p.stage)).length;
    const rdv = list.filter((p) => ["RDV pris", "Entretien / Dossier"].includes(p.stage)).length;
    const dossiers = list.filter((p) => p.stage === "Entretien / Dossier").length;
    return { contacts: list.length, echanges, rdv, dossiers };
  };

  const buildPrescripteur = (): SprintPrescripteurCounts => {
    const list = forCategory("prescripteur");
    const echanges = list.filter((p) =>
      ["Répondu", "Échange qualifié", "Mise en relation obtenue", "Nouveau lead client généré"].includes(p.stage)
    ).length;
    const misesEnRelation = list.filter((p) =>
      ["Mise en relation obtenue", "Nouveau lead client généré"].includes(p.stage)
    ).length;
    const leads = list.filter((p) => p.stage === "Nouveau lead client généré").length;
    return { contacts: list.length, echanges, misesEnRelation, leads };
  };

  return { recrutement: build("recrutement"), client: build("client"), prescripteur: buildPrescripteur() };
}

// Moyenne des % d'avancement (plafonnés à 100) sur les 12 cibles du sprint —
// un seul chiffre pour repérer d'un coup d'œil qui est en avance/retard.
export function sprintOverallProgress(sprint: LinkedinSprint, counts: SprintCounts): number {
  const pairs: [number, number][] = [
    [counts.recrutement.contacts, sprint.cible_contacts_recrutement],
    [counts.recrutement.echanges, sprint.cible_echanges_recrutement],
    [counts.recrutement.rdv, sprint.cible_entretiens_recrutement],
    [counts.recrutement.dossiers, sprint.cible_jfa_recrutement],
    [counts.client.contacts, sprint.cible_contacts_client],
    [counts.client.echanges, sprint.cible_echanges_client],
    [counts.client.rdv, sprint.cible_rdv_client],
    [counts.client.dossiers, sprint.cible_dossiers_client],
    [counts.prescripteur.contacts, sprint.cible_contacts_prescripteur],
    [counts.prescripteur.echanges, sprint.cible_echanges_prescripteur],
    [counts.prescripteur.misesEnRelation, sprint.cible_mises_en_relation_prescripteur],
    [counts.prescripteur.leads, sprint.cible_leads_prescripteur],
  ];
  const pcts = pairs.filter(([, target]) => target > 0).map(([current, target]) => Math.min(100, (current / target) * 100));
  if (pcts.length === 0) return 0;
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}
