import type { LinkedinGroup } from "./types";

// minuscules, sans accents, traits d'union et ponctuation -> espaces
export function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-–_/,.()|&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "ovb" ne doit pas matcher "novb..." : les sigles courts se testent en mot entier
const word = (w: string) => new RegExp(`(^| )${w}( |$)`);
const anyOf = (text: string, stems: string[], whole: string[] = []) =>
  stems.some((s) => text.includes(s)) || whole.some((w) => word(w).test(text));

const LEADERSHIP = [
  "directeur", "directrice", "direction", "fondateur", "fondatrice", "founder", "ceo", "gerant", "gerante",
  "coordinateur", "coordinatrice", "chef", "leader", "mandataire", "administrateur", "administratrice",
];
const CARE_STEMS = [
  "repos", "residence", "soin", "sante", "hopital", "clinique", "korian", "vulpia", "armonea", "novadia",
  "emeis", "vivalto", "isosl", "infirm", "senior", "health", "zorg",
];
const CARE_WHOLE = ["chu", "csd", "acn", "ugib", "care", "cpas", "isosl"];

const NURSE = ["infirm", "nurse", "aide soignant", "sage femme", "kine", "orthophon", "pharmac", "puericult"];
const PRESCRIBER_STEMS = [
  "comptable", "avocat", "immobilier", "recrutement", "assurance", "courtier", "banque", "fiscal", "audit",
  "notaire", "mutualite",
];
const RECRUIT_STEMS = [
  "etudiant", "stagiaire", "commercial", "vendeur", "business developer", "agent de securite", "serveur", "hotesse",
];
const RECRUIT_WHOLE = ["sales", "garde", "employe", "employee", "employes"];
const SECURITY_OR_SALES = ["securite", "commercial", "vendeur", "business developer"];
const NETWORK_P1 = [
  "fondateur", "fondatrice", "founder", "asbl", "vzw", "association", "reseau", "groupe", "ugib", "acn", "csd",
  "multi site", "federation",
];
const INDEPENDENT = ["independant", "independante", "liberal", "freelance", "zelfstandig", "self employed"];

export interface ClassifyInput {
  firstName: string;
  lastName: string;
  position: string | null;
  company: string | null;
}

export interface Classification {
  grp: LinkedinGroup;
  priority: 1 | 2 | 3;
  tags: string[];
}

// teamNames : noms normalisés (dans les deux ordres) des personnes de l'équipe du CRM
export function classify(input: ClassifyInput, teamNames: Set<string>): Classification {
  const position = normalize(input.position);
  const company = normalize(input.company);
  const both = `${position} ${company}`.trim();
  const fullName = normalize(`${input.firstName} ${input.lastName}`);

  const tags: string[] = [];
  if (company.includes("g4s")) tags.push("ex-collègue G4S");
  if (anyOf(both, INDEPENDENT)) tags.push("indépendant");

  const isTeam =
    anyOf(company, ["prepared mind", "futurs leaders"], ["ovb"]) || (fullName.length > 0 && teamNames.has(fullName));
  if (isTeam) return { grp: "E", priority: 3, tags };

  if (anyOf(position, LEADERSHIP) && anyOf(both, CARE_STEMS, CARE_WHOLE)) {
    const strong = anyOf(both, NETWORK_P1);
    return { grp: "A", priority: strong ? 1 : 2, tags };
  }

  if (anyOf(position, NURSE)) {
    return { grp: "B", priority: tags.includes("indépendant") ? 1 : 2, tags };
  }

  if (anyOf(position, PRESCRIBER_STEMS, ["rh"])) {
    return { grp: "C", priority: 2, tags };
  }

  if (anyOf(position, RECRUIT_STEMS, RECRUIT_WHOLE)) {
    return { grp: "D", priority: anyOf(position, SECURITY_OR_SALES, ["sales"]) ? 2 : 3, tags };
  }

  return { grp: "F", priority: 3, tags };
}

export function buildTeamNames(names: string[]): Set<string> {
  const set = new Set<string>();
  for (const raw of names) {
    const n = normalize(raw);
    if (n) set.add(n);
    // "Nom, Prénom" -> aussi "prénom nom"
    if (raw.includes(",")) {
      const [last, first] = raw.split(",").map((p) => p.trim());
      const swapped = normalize(`${first} ${last}`);
      if (swapped) set.add(swapped);
    } else {
      const parts = n.split(" ");
      if (parts.length === 2) set.add(`${parts[1]} ${parts[0]}`);
    }
  }
  return set;
}
