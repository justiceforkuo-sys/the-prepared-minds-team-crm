export type LinkedinGroup = "A" | "B" | "C" | "D" | "E" | "F";

export const LINKEDIN_STATUSES = [
  "À contacter",
  "Contacté",
  "Relance envoyée",
  "Dernier message envoyé",
  "À toi de répondre",
  "En conversation",
  "RDV fixé",
  "Client / Partenaire",
  "Plus tard",
  "Pas intéressé",
  "Sollicitation reçue",
  "Équipe / réseau",
] as const;

export type LinkedinStatus = (typeof LINKEDIN_STATUSES)[number];

export interface LinkedinContact {
  id: string;
  owner_id: string;
  first_name: string;
  last_name: string;
  linkedin_url: string;
  company: string | null;
  position: string | null;
  connected_on: string | null;
  grp: LinkedinGroup;
  priority: 1 | 2 | 3;
  status: LinkedinStatus;
  last_contact: string | null;
  next_action: string | null;
  msgs_sent: number;
  msgs_received: number;
  note: string;
  tags: string[];
  prospect_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedinEvent {
  id: string;
  contact_id: string;
  owner_id: string;
  action: string;
  created_at: string;
}

export type MessageStep = "1" | "2" | "3" | "reply";

export const DAILY_LIMIT = 20;
