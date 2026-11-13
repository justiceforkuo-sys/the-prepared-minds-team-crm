"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { fsmaFlags } from "@/lib/linkedin/templates";

// Discussion instantanée : toutes les écritures passent ici (vérifications, mots à risque, limite de débit).
// La lecture en direct (nouveaux messages) se fait côté navigateur, sous les règles d'accès de la base.

export interface ChatPerson {
  id: string;
  name: string;
  rank: string;
}
export interface ChatReaction {
  person_id: string;
  emoji: string;
}
export interface ChatMsg {
  id: string;
  author_id: string;
  recipient_id: string | null;
  body: string;
  kind: "message" | "victoire";
  created_at: string;
  chat_reactions: ChatReaction[];
}
export interface ChatBoot {
  people: ChatPerson[];
  messages: ChatMsg[];
  reads: Record<string, string>;
  now: string;
}
export type ChatResult = { ok: true } | { ok: false; error: string };
export type ChatSendResult = { ok: true; data: ChatMsg } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMOJIS = ["👏", "🔥", "💪", "❤️", "😂", "🎉"];
const COLS = "id, author_id, recipient_id, body, kind, created_at, chat_reactions(person_id, emoji)";

async function contexte() {
  const me = await getCurrentPerson();
  if (!me) return null;
  return { me, svc: createServiceClient() as unknown as SupabaseClient };
}

/** Données de départ : les membres de l'équipe, l'historique récent du salon et des messages privés de la personne, et ses lectures. */
export async function chargerChat(): Promise<ChatBoot | null> {
  const c = await contexte();
  if (!c) return null;
  const [{ data: people }, { data: team }, { data: dms }, { data: reads }] = await Promise.all([
    c.svc.from("people").select("id, name, rank").eq("active", true).order("name"),
    c.svc.from("chat_messages").select(COLS).is("recipient_id", null).is("deleted_at", null).order("created_at", { ascending: false }).limit(150),
    c.svc.from("chat_messages").select(COLS).not("recipient_id", "is", null).is("deleted_at", null).or(`author_id.eq.${c.me.id},recipient_id.eq.${c.me.id}`).order("created_at", { ascending: false }).limit(300),
    c.svc.from("chat_reads").select("conv, last_read_at").eq("person_id", c.me.id),
  ]);
  const messages = [...((team as ChatMsg[] | null) ?? []), ...((dms as ChatMsg[] | null) ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const lectures: Record<string, string> = {};
  for (const r of (reads as { conv: string; last_read_at: string }[] | null) ?? []) lectures[r.conv] = r.last_read_at;
  return { people: (people as ChatPerson[] | null) ?? [], messages, reads: lectures, now: new Date().toISOString() };
}

/** Envoie un message : conv = « team » (salon) ou l'identifiant de la personne (message privé). */
export async function envoyerMessage(conv: string, texte: string): Promise<ChatSendResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Session expirée." };
  const body = (texte ?? "").replace(/\s+/g, " ").trim();
  if (!body) return { ok: false, error: "Message vide." };
  if (body.length > 1000) return { ok: false, error: "1 000 caractères au maximum." };
  const flags = [...new Set(fsmaFlags(body))];
  if (flags.length > 0) return { ok: false, error: `Évite ces mots : ${flags.join(", ")}. Pas de promesse de rendement ni de « garanti » (règle FSMA).` };

  let recipient: string | null = null;
  if (conv !== "team") {
    if (!UUID.test(conv) || conv === c.me.id) return { ok: false, error: "Destinataire invalide." };
    const { data: p } = await c.svc.from("people").select("id, active").eq("id", conv).maybeSingle();
    if (!p || !(p as { active: boolean }).active) return { ok: false, error: "Cette personne n'est plus dans l'équipe." };
    recipient = conv;
  }
  const depuis = new Date(Date.now() - 60_000).toISOString();
  const { count } = await c.svc.from("chat_messages").select("id", { count: "exact", head: true }).eq("author_id", c.me.id).gte("created_at", depuis);
  if ((count ?? 0) >= 20) return { ok: false, error: "Doucement : 20 messages par minute au maximum." };

  const { data, error } = await c.svc.from("chat_messages").insert({ author_id: c.me.id, recipient_id: recipient, body, kind: "message" }).select(COLS).single();
  if (error || !data) return { ok: false, error: "Message non envoyé, réessaie." };
  return { ok: true, data: data as ChatMsg };
}

async function messageVisible(c: NonNullable<Awaited<ReturnType<typeof contexte>>>, id: string) {
  const { data } = await c.svc.from("chat_messages").select("id, author_id, recipient_id, deleted_at").eq("id", id).maybeSingle();
  const m = data as { id: string; author_id: string; recipient_id: string | null; deleted_at: string | null } | null;
  if (!m || m.deleted_at) return null;
  if (m.recipient_id !== null && m.author_id !== c.me.id && m.recipient_id !== c.me.id) return null;
  return m;
}

/** Réaction en un clic : un deuxième clic la retire. */
export async function reagir(messageId: string, emoji: string): Promise<ChatResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Session expirée." };
  if (!UUID.test(messageId) || !EMOJIS.includes(emoji)) return { ok: false, error: "Réaction invalide." };
  if (!(await messageVisible(c, messageId))) return { ok: false, error: "Message introuvable." };
  const { data: ex } = await c.svc.from("chat_reactions").select("message_id").eq("message_id", messageId).eq("person_id", c.me.id).eq("emoji", emoji).maybeSingle();
  if (ex) await c.svc.from("chat_reactions").delete().eq("message_id", messageId).eq("person_id", c.me.id).eq("emoji", emoji);
  else await c.svc.from("chat_reactions").insert({ message_id: messageId, person_id: c.me.id, emoji });
  return { ok: true };
}

/** Supprime un message : son auteur, ou un administrateur pour un message du salon. Le texte est effacé. */
export async function supprimerMessage(id: string): Promise<ChatResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Session expirée." };
  if (!UUID.test(id)) return { ok: false, error: "Message invalide." };
  const m = await messageVisible(c, id);
  if (!m) return { ok: false, error: "Message introuvable." };
  const droit = m.author_id === c.me.id || (c.me.is_admin && m.recipient_id === null);
  if (!droit) return { ok: false, error: "Tu ne peux pas supprimer ce message." };
  const { error } = await c.svc.from("chat_messages").update({ body: "", deleted_at: new Date().toISOString() }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Marque une conversation comme lue (conv = « team » ou « dm:<id de l'autre personne> »). */
export async function marquerLu(conv: string): Promise<ChatResult> {
  const c = await contexte();
  if (!c) return { ok: false, error: "Session expirée." };
  if (conv !== "team" && !/^dm:[0-9a-f-]{36}$/i.test(conv)) return { ok: false, error: "Conversation invalide." };
  await c.svc.from("chat_reads").upsert({ person_id: c.me.id, conv, last_read_at: new Date().toISOString() }, { onConflict: "person_id,conv" });
  return { ok: true };
}
