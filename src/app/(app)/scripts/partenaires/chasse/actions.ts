"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { FORMATS_RDV_CHASSE, STATUTS_CHASSE, TYPES_STRUCTURE } from "@/lib/entrainement-partenaires";

export type ChasseResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUTS = STATUTS_CHASSE.map((s) => s.id) as string[];
const TYPES = TYPES_STRUCTURE.map((t) => t.id) as string[];
const FORMATS = FORMATS_RDV_CHASSE.map((f) => f.id) as string[];

export interface ChasseChamps {
  nom: string;
  type: string;
  zone: string;
  adresse: string;
  statut: string;
  /** "1", "2", "3" ou "" */
  priorite: string;
  remarque: string;
  contact_nom: string;
  contact_tel: string;
  tel_a_verifier: boolean;
  contact_email: string;
  contact_web: string;
  /** Date et heure locales saisies (YYYY-MM-DDTHH:mm), heure de Bruxelles ; vide si pas de rendez-vous. */
  rdv_at: string;
  rdv_format: string;
  rdv_lieu: string;
  confirmation_envoyee: boolean;
  nb_appels: number;
  prochaine_etape: string;
  /** YYYY-MM-DD ou "" */
  relance_le: string;
  notes: string;
}

const txt = (v: string, max: number) => v.trim().slice(0, max) || null;

/** Heure de Bruxelles (saisie sans fuseau) → instant UTC en ISO. */
function bruxellesVersIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Décalage de Bruxelles à cet instant (1 h l'hiver, 2 h l'été), calculé sans bibliothèque.
  for (const decalage of [1, 2]) {
    const t = asUtc - decalage * 3600_000;
    const h2 = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour: "2-digit", hour12: false }).format(new Date(t)));
    if (h2 % 24 === h) return new Date(t).toISOString();
  }
  return new Date(asUtc - 3600_000).toISOString();
}

function valider(c: ChasseChamps): string | null {
  if (!c.nom.trim()) return "Donne le nom de la structure.";
  if (!TYPES.includes(c.type) || !STATUTS.includes(c.statut)) return "Données invalides.";
  if (c.priorite && !["1", "2", "3"].includes(c.priorite)) return "Données invalides.";
  if (c.rdv_format && !FORMATS.includes(c.rdv_format)) return "Données invalides.";
  if (c.contact_email.trim() && !/^\S+@\S+\.\S+$/.test(c.contact_email.trim())) return "Adresse e-mail invalide.";
  if (c.rdv_at && !bruxellesVersIso(c.rdv_at)) return "Date de rendez-vous invalide.";
  if (c.relance_le && (!DATE.test(c.relance_le) || c.relance_le < "2020-01-01" || c.relance_le > "2100-12-31")) return "Date de relance invalide.";
  if (!Number.isFinite(c.nb_appels) || c.nb_appels < 0 || c.nb_appels > 999) return "Nombre d'appels invalide.";
  return null;
}

function ligne(c: ChasseChamps) {
  return {
    nom: c.nom.trim().slice(0, 120),
    type: c.type,
    zone: txt(c.zone, 120),
    adresse: txt(c.adresse, 200),
    statut: c.statut,
    priorite: c.priorite ? Number(c.priorite) : null,
    remarque: txt(c.remarque, 300),
    contact_nom: txt(c.contact_nom, 120),
    contact_tel: txt(c.contact_tel, 60),
    tel_a_verifier: c.tel_a_verifier,
    contact_email: txt(c.contact_email, 160),
    contact_web: txt(c.contact_web, 160),
    rdv_at: c.rdv_at ? bruxellesVersIso(c.rdv_at) : null,
    rdv_format: c.rdv_format || null,
    rdv_lieu: txt(c.rdv_lieu, 200),
    confirmation_envoyee: c.confirmation_envoyee,
    nb_appels: Math.round(c.nb_appels),
    prochaine_etape: txt(c.prochaine_etape, 160),
    relance_le: c.relance_le || null,
    notes: txt(c.notes, 3000),
    updated_at: new Date().toISOString(),
  };
}

export async function ajouterStructure(nom: string, type: string, zone: string): Promise<ChasseResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  if (!nom.trim()) return { ok: false, error: "Donne le nom de la structure." };
  if (!TYPES.includes(type)) return { ok: false, error: "Données invalides." };
  const svc = createServiceClient() as unknown as SupabaseClient;
  const { error } = await svc.from("partenaires_chasse").insert({ owner_id: me.id, nom: nom.trim().slice(0, 120), type, zone: txt(zone, 120) });
  if (error) return { ok: false, error: error.code === "23505" ? "Cette structure est déjà dans ta liste." : error.message };
  revalidatePath("/scripts/partenaires/chasse");
  return { ok: true };
}

/** Enregistre la fiche d'une structure (la sienne uniquement). Le dernier appel passe à aujourd'hui quand le nombre d'appels augmente. */
export async function enregistrerStructure(id: string, c: ChasseChamps): Promise<ChasseResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  if (!UUID.test(id)) return { ok: false, error: "Données invalides." };
  const err = valider(c);
  if (err) return { ok: false, error: err };
  const svc = createServiceClient() as unknown as SupabaseClient;
  const { data } = await svc.from("partenaires_chasse").select("owner_id, nb_appels").eq("id", id).maybeSingle();
  const cur = data as { owner_id: string; nb_appels: number } | null;
  if (!cur || cur.owner_id !== me.id) return { ok: false, error: "Structure introuvable." };
  const patch: Record<string, unknown> = ligne(c);
  if (Math.round(c.nb_appels) > cur.nb_appels) {
    patch.dernier_appel = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Brussels" }).format(new Date());
  }
  const { error } = await svc.from("partenaires_chasse").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? "Une autre structure porte déjà ce nom dans ce type." : error.message };
  revalidatePath("/scripts/partenaires/chasse");
  return { ok: true };
}

export async function supprimerStructure(id: string): Promise<ChasseResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  if (!UUID.test(id)) return { ok: false, error: "Données invalides." };
  const svc = createServiceClient() as unknown as SupabaseClient;
  const { error } = await svc.from("partenaires_chasse").delete().eq("id", id).eq("owner_id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/scripts/partenaires/chasse");
  return { ok: true };
}
