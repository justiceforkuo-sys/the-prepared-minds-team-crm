// Bloc 8 — Mes idées : types partagés et file d'attente locale (une idée ne doit jamais se perdre, même hors ligne).

export type IdeeSource = "voix" | "texte";
export type IdeeStatut = "a_traiter" | "en_action" | "classee";
export type Fleche = "Ma team" | "Vision d'ensemble";
export const FLECHES: Fleche[] = ["Ma team", "Vision d'ensemble"];

export interface Idee {
  id: string;
  user_id: string;
  cree_le: string;
  source: IdeeSource;
  texte_brut: string;
  reformulation: string | null;
  tiroir: string | null;
  fleche: Fleche | null;
  questions: string[] | null;
  faisabilite: string | null;
  prochaine_action: string | null;
  action_date: string | null;
  statut: IdeeStatut;
  partagee_avec: string | null;
  traitement_ia: "en_attente" | "fait" | "erreur";
  traitement_erreur: string | null;
  convertie_en: "tache" | "prospect" | "candidature" | null;
  maj_le: string;
}

export interface Tiroir {
  id: number;
  owner_id: string | null;
  numero: number;
  nom: string;
  famille: string | null;
}

export const STATUT_LABEL: Record<IdeeStatut, string> = { a_traiter: "À traiter", en_action: "En action", classee: "Classée" };

/** Une idée est « à traiter » tant qu'aucune action n'est validée. */
export const isPending = (i: Pick<Idee, "statut">) => i.statut === "a_traiter";

// ---- File d'attente locale (navigateur) ----------------------------------------------------------------
export interface QueuedIdee {
  id: string;
  texte: string;
  source: IdeeSource;
  cree_le: string;
}

export const QUEUE_KEY = "pmt_idees_queue";

export function loadQueue(): QueuedIdee[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as QueuedIdee[]) : [];
    return Array.isArray(list) ? list.filter((q) => q && typeof q.id === "string" && typeof q.texte === "string") : [];
  } catch {
    return [];
  }
}

export function saveQueue(list: QueuedIdee[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  } catch {
    // stockage plein ou indisponible : l'idée reste dans le formulaire, rien n'est supprimé
  }
}

export function newIdeeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
