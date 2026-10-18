import type { LinkedinGroup, LinkedinStatus, MessageStep } from "./types";

export const GROUPS: { code: LinkedinGroup; label: string; help: string }[] = [
  { code: "A", label: "Structures partenaires", help: "Modèle MonINFI : ils donnent accès à toute une équipe ou un réseau de soignants." },
  { code: "B", label: "Soignants", help: "Clients potentiels : protection en cas d'arrêt, pension, fiscalité." },
  { code: "C", label: "Prescripteurs", help: "Recommandations croisées : ils croisent des clients qui ont besoin de toi, et inversement." },
  { code: "D", label: "Recrues", help: "Profils pour Prepared Minds Team." },
  { code: "E", label: "Équipe & réseau", help: "On entretient, on ne prospecte pas (aucun message proposé)." },
  { code: "F", label: "À qualifier", help: "Ranger la personne dans un groupe pour obtenir son message." },
];

export const GROUP_LABEL: Record<LinkedinGroup, string> = Object.fromEntries(
  GROUPS.map((g) => [g.code, g.label])
) as Record<LinkedinGroup, string>;

// Statuts clos : jamais "relance due".
export const CLOSED_STATUSES = new Set<LinkedinStatus>([
  "Pas intéressé",
  "Client / Partenaire",
  "Équipe / réseau",
  "Sollicitation reçue",
  "Dernier message envoyé",
]);

export const STATUS_COLOR: Record<LinkedinStatus, string> = {
  "À contacter": "#8a97b0",
  Contacté: "#3d8fe0",
  "Relance envoyée": "#e0b93a",
  "Dernier message envoyé": "#8a5a3a",
  "À toi de répondre": "#d9534f",
  "En conversation": "#6c5ce7",
  "RDV fixé": "#2fa56f",
  "Client / Partenaire": "#1f8158",
  "Plus tard": "#b8923f",
  "Pas intéressé": "#6b7280",
  "Sollicitation reçue": "#6b7280",
  "Équipe / réseau": "#3b6fb6",
};

// Étape de message proposée selon le statut ; null = aucun message.
export function stepFor(status: LinkedinStatus, grp: LinkedinGroup): MessageStep | null {
  if (grp === "E" || grp === "F") return null;
  switch (status) {
    case "À contacter":
    case "Plus tard":
      return "1";
    case "Contacté":
      return "2";
    case "Relance envoyée":
      return "3";
    case "À toi de répondre":
    case "En conversation":
      return "reply";
    default:
      return null;
  }
}

export const STEP_LABEL: Record<MessageStep, string> = {
  "1": "Message 1 — première approche (une vraie question)",
  "2": "Message 2 — relance (proposition claire)",
  "3": "Message 3 — dernier message",
  reply: "Réponse",
};

// Effet de "J'ai envoyé" : nouveau statut + délai avant la prochaine action (jours).
export function afterSend(status: LinkedinStatus): { status: LinkedinStatus; days: number | null } | null {
  switch (status) {
    case "À contacter":
    case "Plus tard":
      return { status: "Contacté", days: 5 };
    case "Contacté":
      return { status: "Relance envoyée", days: 7 };
    case "Relance envoyée":
      return { status: "Dernier message envoyé", days: null };
    case "À toi de répondre":
    case "En conversation":
      return { status: "En conversation", days: 3 };
    default:
      return null;
  }
}
