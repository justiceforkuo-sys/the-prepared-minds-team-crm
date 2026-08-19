"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

const STASH_COOKIE = "impersonator_session";

export async function startImpersonation(targetPersonId: string) {
  const admin = await getCurrentPerson();
  if (!admin?.is_admin) throw new Error("Non autorisé.");
  if (targetPersonId === admin.id) return;

  const service = createServiceClient();
  const { data: target } = await service
    .from("people")
    .select("id, email")
    .eq("id", targetPersonId)
    .single();
  if (!target?.email) throw new Error("Cette fiche n'a pas d'email associé.");

  const supabase = await createClient();
  const { data: currentSession } = await supabase.auth.getSession();
  if (!currentSession.session) throw new Error("Session admin introuvable.");

  const { data: log } = await service
    .from("admin_impersonation_log")
    .insert({ admin_id: admin.id, target_id: target.id })
    .select("id")
    .single();

  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email: target.email,
  });
  if (linkError || !link.properties?.hashed_token) {
    throw new Error(linkError?.message ?? "Impossible de générer le lien d'accès.");
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) throw new Error(verifyError.message);

  const cookieStore = await cookies();
  cookieStore.set(
    STASH_COOKIE,
    JSON.stringify({
      access_token: currentSession.session.access_token,
      refresh_token: currentSession.session.refresh_token,
      log_id: log?.id ?? null,
    }),
    { httpOnly: true, secure: true, sameSite: "lax", path: "/" }
  );

  redirect("/");
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STASH_COOKIE)?.value;
  if (!raw) return;

  const stash = JSON.parse(raw) as {
    access_token: string;
    refresh_token: string;
    log_id: string | null;
  };

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: stash.access_token,
    refresh_token: stash.refresh_token,
  });

  cookieStore.delete(STASH_COOKIE);

  if (stash.log_id) {
    const service = createServiceClient();
    await service
      .from("admin_impersonation_log")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", stash.log_id);
  }

  if (error) throw new Error(error.message);

  redirect("/admin");
}

export async function getImpersonationTargetName(): Promise<string | null> {
  const cookieStore = await cookies();
  if (!cookieStore.get(STASH_COOKIE)?.value) return null;
  const person = await getCurrentPerson();
  return person?.name ?? null;
}
