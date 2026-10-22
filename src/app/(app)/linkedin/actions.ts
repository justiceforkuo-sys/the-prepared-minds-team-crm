"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";

export type LinkedinActionResult = { ok: true } | { ok: false; error: string };

/** Objectif « nouvelles relations cette semaine » de la personne connectée. */
export async function setWeeklyGoal(goal: number): Promise<LinkedinActionResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  if (!Number.isInteger(goal) || goal < 0 || goal > 500) return { ok: false, error: "Objectif invalide (0 à 500)." };
  const service = createServiceClient() as unknown as SupabaseClient;
  const { error } = await service.from("people").update({ linkedin_weekly_goal: goal }).eq("id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/linkedin");
  return { ok: true };
}

/** Mémorise la date du dernier import de Connections.csv (rappel mensuel). */
export async function recordLinkedinImport(): Promise<LinkedinActionResult> {
  const me = await getCurrentPerson();
  if (!me) return { ok: false, error: "Session expirée." };
  const service = createServiceClient() as unknown as SupabaseClient;
  const { error } = await service.from("people").update({ linkedin_last_import_at: new Date().toISOString() }).eq("id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/linkedin");
  revalidatePath("/");
  return { ok: true };
}
