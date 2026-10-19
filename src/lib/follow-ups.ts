// Suivis de prospects : UNE seule définition, partagée par la page Aujourd'hui (compteurs)
// et par le bandeau « À relancer » de /prospects. Les tâches d'équipe n'en font pas partie.
import type { Prospect } from "@/types/database";

/** Étapes finales : un prospect à cette étape n'est plus à relancer. */
export const TERMINAL_STAGES = ["Perdu", "Partenaire", "Sans suite"] as const;

/** Même liste, au format du filtre PostgREST `.not("stage", "in", …)`. */
export const TERMINAL_STAGES_FILTER = `(${TERMINAL_STAGES.join(",")})`;

/** Fenêtre « Cette semaine » : les 7 prochains jours (demain → J+7). */
export const WEEK_HORIZON_DAYS = 7;

export type FollowUpRow = Pick<Prospect, "id" | "owner_id" | "name" | "category" | "stage" | "next_follow_up">;

export const FOLLOW_UP_COLUMNS = "id, owner_id, name, category, stage, next_follow_up";

export function isOpenFollowUp(p: Pick<Prospect, "owner_id" | "stage" | "next_follow_up">, ownerId: string): boolean {
  return (
    p.owner_id === ownerId &&
    p.next_follow_up !== null &&
    !(TERMINAL_STAGES as readonly string[]).includes(p.stage)
  );
}

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const f = fromIso.split("-").map(Number);
  const t = toIso.split("-").map(Number);
  return Math.round((Date.UTC(t[0], t[1] - 1, t[2]) - Date.UTC(f[0], f[1] - 1, f[2])) / 86400000);
}

export interface FollowUpBuckets<T> {
  late: T[];
  today: T[];
  week: T[];
}

/** Répartit les suivis ouverts d'un propriétaire : en retard / aujourd'hui / 7 prochains jours. */
export function bucketFollowUps<T extends Pick<Prospect, "owner_id" | "stage" | "next_follow_up">>(
  rows: T[],
  ownerId: string,
  today: string
): FollowUpBuckets<T> {
  const horizon = addDaysIso(today, WEEK_HORIZON_DAYS);
  const open = rows
    .filter((p) => isOpenFollowUp(p, ownerId))
    .sort((a, b) => ((a.next_follow_up as string) < (b.next_follow_up as string) ? -1 : 1));
  return {
    late: open.filter((p) => (p.next_follow_up as string) < today),
    today: open.filter((p) => p.next_follow_up === today),
    week: open.filter((p) => (p.next_follow_up as string) > today && (p.next_follow_up as string) <= horizon),
  };
}
