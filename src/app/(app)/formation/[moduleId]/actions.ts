"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { FORMATION_MODULES } from "@/lib/formation-modules";

const BUCKET = "formation-media";
const MAX_BYTES = 50 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = { video: "video/mp4", pdf: "application/pdf" } as const;

type Kind = keyof typeof KINDS;

async function admin() {
  const me = await getCurrentPerson();
  if (!me || !me.is_admin) return null;
  return { me, svc: createServiceClient() as unknown as SupabaseClient };
}

export type PrepareResult = { ok: true; path: string; token: string } | { ok: false; error: string };

/** Étape 1 : le serveur délivre un lien d'envoi à usage unique vers le stockage privé (administrateur). */
export async function preparerEnvoiMedia(moduleId: string, kind: Kind, filename: string, mime: string, size: number): Promise<PrepareResult> {
  const c = await admin();
  if (!c) return { ok: false, error: "Réservé à l'administrateur." };
  if (!FORMATION_MODULES.some((m) => m.id === moduleId)) return { ok: false, error: "Module inconnu." };
  if (!(kind in KINDS) || mime !== KINDS[kind]) return { ok: false, error: kind === "video" ? "Format accepté : vidéo MP4." : "Format accepté : PDF." };
  if (!(size > 0) || size > MAX_BYTES) return { ok: false, error: "Fichier trop lourd (50 Mo maximum) : compresse-le avant l'envoi." };
  const safe = filename.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80) || "fichier";
  const path = `${moduleId}/${crypto.randomUUID()}-${safe}`;
  const { data, error } = await c.svc.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? "Envoi impossible." };
  return { ok: true, path, token: data.token };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** Étape 2 : enregistre la ressource une fois le fichier reçu. */
export async function enregistrerMedia(moduleId: string, kind: Kind, path: string, title: string, size: number): Promise<SimpleResult> {
  const c = await admin();
  if (!c) return { ok: false, error: "Réservé à l'administrateur." };
  if (!path.startsWith(`${moduleId}/`) || path.includes("..") || !(kind in KINDS)) return { ok: false, error: "Données invalides." };
  const folder = await c.svc.storage.from(BUCKET).list(moduleId, { limit: 500 });
  if (!folder.data?.some((f) => `${moduleId}/${f.name}` === path)) return { ok: false, error: "Le fichier n'a pas été reçu : recommence l'envoi." };
  const { data: last } = await c.svc.from("formation_media").select("ordre").eq("module_id", moduleId).order("ordre", { ascending: false }).limit(1);
  const ordre = ((last as { ordre: number }[] | null)?.[0]?.ordre ?? -1) + 1;
  const { error } = await c.svc
    .from("formation_media")
    .insert({ module_id: moduleId, kind, title: title.trim().slice(0, 120) || (kind === "video" ? "Vidéo du module" : "Support du module"), path, size_bytes: size, ordre, uploaded_by: c.me.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/formation/${moduleId}`);
  return { ok: true };
}

export async function supprimerMedia(mediaId: string): Promise<SimpleResult> {
  const c = await admin();
  if (!c) return { ok: false, error: "Réservé à l'administrateur." };
  if (!UUID.test(mediaId)) return { ok: false, error: "Ressource invalide." };
  const { data } = await c.svc.from("formation_media").select("module_id, path").eq("id", mediaId).maybeSingle();
  const row = data as { module_id: string; path: string } | null;
  if (!row) return { ok: false, error: "Ressource introuvable." };
  const { error } = await c.svc.from("formation_media").delete().eq("id", mediaId);
  if (error) return { ok: false, error: error.message };
  await c.svc.storage.from(BUCKET).remove([row.path]);
  revalidatePath(`/formation/${row.module_id}`);
  return { ok: true };
}
