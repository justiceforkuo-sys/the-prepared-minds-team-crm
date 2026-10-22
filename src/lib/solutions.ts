// Bloc 9 — Bibliothèque des solutions : types, libellés, recherche plein texte et règles de revérification.

export type Famille = "protection" | "epargne" | "iard" | "credit";
export const FAMILLES: { key: Famille; label: string }[] = [
  { key: "protection", label: "Protection" },
  { key: "epargne", label: "Épargne" },
  { key: "iard", label: "IARD" },
  { key: "credit", label: "Crédit" },
];
export const familleLabel = (f: Famille) => FAMILLES.find((x) => x.key === f)?.label ?? f;

/** Modules de formation réglementaire du parcours du nouveau (bloc 5). */
export const SOLUTION_MODULES = ["1.1", "1.2", "3.1", "3.2", "4"] as const;

export interface FaqItem {
  q: string;
  r: string;
}
export interface SolutionLink {
  label: string;
  url: string;
}

export interface Solution {
  id: string;
  nom: string;
  famille: Famille;
  compagnies: string[];
  pour_qui: string | null;
  probleme: string | null;
  fonctionnement: string | null;
  fiscalite: string | null;
  fiscalite_annee: number | null;
  conditions: string | null;
  exclusions: string | null;
  quand_ne_pas_proposer: string | null;
  faq: FaqItem[];
  modules_fsma: string[];
  liens: SolutionLink[];
  unites_info: string | null;
  verifiee_le: string | null;
  verifiee_par: string | null;
  publiee: boolean;
  ordre: number;
}

export type DocType = "conditions_generales" | "fiche_information" | "brochure" | "autre";
export const DOC_TYPE_LABEL: Record<DocType, string> = {
  conditions_generales: "Conditions générales",
  fiche_information: "Fiche d'information",
  brochure: "Brochure",
  autre: "Autre document officiel",
};
export type DocSource = "compagnie" | "ovb_willemot";
export const DOC_SOURCE_LABEL: Record<DocSource, string> = { compagnie: "Compagnie", ovb_willemot: "OVB Willemot" };

export interface SolutionDocument {
  id: string;
  solution_id: string;
  type: DocType;
  titre: string;
  fichier_path: string;
  version: string | null;
  date_version: string | null;
  source: DocSource;
  source_nom: string | null;
  depose_le: string;
}

export const DISCLAIMER = "Outil de formation interne. Ne remplace pas les documents précontractuels officiels à remettre au client.";

/** minuscules, sans accents, ponctuation en espaces */
export function fold(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Texte interrogeable d'une fiche (tous les champs rédactionnels, FAQ comprise). */
export function searchText(s: Solution): string {
  return fold(
    [s.nom, s.compagnies.join(" "), s.pour_qui, s.probleme, s.fonctionnement, s.fiscalite, s.conditions, s.exclusions, s.quand_ne_pas_proposer, s.unites_info, ...s.faq.map((f) => `${f.q} ${f.r}`)].join(" ")
  );
}

/** Recherche plein texte : tous les mots saisis doivent apparaître (insensible aux accents et à la casse). */
export function matches(s: Solution, query: string): boolean {
  const words = fold(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const hay = searchText(s);
  return words.every((w) => hay.includes(w));
}

const addMonths = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};

export type ReviewReason = "jamais_verifiee" | "plus_de_12_mois" | "nouvelle_version";

/** Une fiche publiée est à revérifier si elle ne l'a jamais été, si la dernière vérification a plus de 12 mois,
 *  ou si un document a été déposé après la dernière vérification (nouvelle version de conditions générales). */
export function reviewReason(s: Pick<Solution, "publiee" | "verifiee_le">, docs: Pick<SolutionDocument, "depose_le">[], today: string): ReviewReason | null {
  if (!s.publiee) return null;
  if (!s.verifiee_le) return "jamais_verifiee";
  if (addMonths(s.verifiee_le, 12) <= today) return "plus_de_12_mois";
  if (docs.some((d) => d.depose_le.slice(0, 10) > s.verifiee_le!)) return "nouvelle_version";
  return null;
}

export const REVIEW_LABEL: Record<ReviewReason, string> = {
  jamais_verifiee: "jamais vérifiée",
  plus_de_12_mois: "non vérifiée depuis plus de 12 mois",
  nouvelle_version: "nouvelle version de document déposée depuis la dernière vérification",
};
