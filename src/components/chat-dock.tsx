"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Bell, BellOff, MessageCircle, Send, SmilePlus, Trash2, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useOnline } from "@/components/presence";
import { chargerChat, envoyerMessage, marquerLu, reagir, supprimerMessage, type ChatMsg, type ChatPerson } from "@/app/(app)/chat-actions";

// Discussion instantanée : un salon pour toute la team et des messages privés. Les messages arrivent en direct (Supabase Realtime) ;
// les écritures passent par des actions serveur. « Ne pas déranger » coupe le son (réglage gardé sur l'appareil).

const EMOJIS = ["👏", "🔥", "💪", "❤️", "😂", "🎉"];
const DND_KEY = "chat_dnd";

const jourKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
const jourLabel = (iso: string) => (jourKey(iso) === jourKey(new Date().toISOString()) ? "Aujourd'hui" : new Date(iso).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Brussels" }));

function bip() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.start();
    o.stop(ctx.currentTime + 0.12);
    window.setTimeout(() => void ctx.close(), 300);
  } catch {
    // pas de son disponible : sans importance
  }
}

export function ChatDock({ meId, isAdmin }: { meId: string; isAdmin: boolean }) {
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const online = useOnline();
  const onlineIds = useMemo(() => new Set(online.map((o) => o.id)), [online]);

  const [people, setPeople] = useState<ChatPerson[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [bootNow, setBootNow] = useState<string>(() => new Date().toISOString());
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState<string | null>(null); // null = liste ; « team » ou « dm:<id> »
  const [dnd, setDnd] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(DND_KEY) === "1";
    } catch {
      return false; // stockage indisponible : le son reste actif
    }
  });
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fond = useRef<HTMLDivElement>(null);
  const live = useRef({ open, conv, dnd });
  useEffect(() => {
    live.current = { open, conv, dnd };
  }, [open, conv, dnd]);

  const nom = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const convOf = (m: Pick<ChatMsg, "author_id" | "recipient_id">) => (m.recipient_id === null ? "team" : `dm:${m.author_id === meId ? m.recipient_id : m.author_id}`);

  // Réglage « ne pas déranger » (gardé sur l'appareil)
  const basculerDnd = () => {
    const v = !dnd;
    setDnd(v);
    try {
      localStorage.setItem(DND_KEY, v ? "1" : "0");
    } catch {
      // sans importance
    }
  };

  // Marque une conversation comme lue (ici et en base)
  // (horloge du serveur et de l'appareil peuvent différer : on prend la plus tardive entre maintenant et le dernier message connu)
  const msgsRef = useRef<ChatMsg[]>([]);
  useEffect(() => {
    msgsRef.current = msgs;
  }, [msgs]);
  const lire = useCallback((k: string, auPlusTard?: string) => {
    const dernierConnu = msgsRef.current.filter((m) => (m.recipient_id === null ? "team" : `dm:${m.author_id === meId ? m.recipient_id : m.author_id}`) === k).map((m) => m.created_at);
    const t = [new Date().toISOString(), auPlusTard ?? "", ...dernierConnu].reduce((a, b) => (b > a ? b : a), "");
    setReads((r) => ({ ...r, [k]: t }));
    void marquerLu(k);
  }, [meId]);

  // Chargement initial
  useEffect(() => {
    let annule = false;
    void chargerChat().then((b) => {
      if (annule || !b) return;
      setPeople(b.people);
      setMsgs(b.messages);
      setReads(b.reads);
      setBootNow(b.now);
    });
    return () => {
      annule = true;
    };
  }, []);

  // Temps réel : nouveaux messages, suppressions, réactions
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        const m = { ...(p.new as Omit<ChatMsg, "chat_reactions">), chat_reactions: [] } as ChatMsg;
        if (m.recipient_id !== null && m.author_id !== meId && m.recipient_id !== meId) return;
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.author_id !== meId) {
          const k = m.recipient_id === null ? "team" : `dm:${m.author_id}`;
          const l = live.current;
          const vu = l.open && l.conv === k && document.visibilityState === "visible";
          if (vu) lire(k, m.created_at);
          else if (!l.dnd) bip();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (p) => {
        const m = p.new as { id: string; deleted_at: string | null };
        if (m.deleted_at) setMsgs((prev) => prev.filter((x) => x.id !== m.id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_reactions" }, (p) => {
        const r = p.new as { message_id: string; person_id: string; emoji: string };
        setMsgs((prev) => prev.map((m) => (m.id === r.message_id && !m.chat_reactions.some((x) => x.person_id === r.person_id && x.emoji === r.emoji) ? { ...m, chat_reactions: [...m.chat_reactions, { person_id: r.person_id, emoji: r.emoji }] } : m)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_reactions" }, (p) => {
        const r = p.old as { message_id?: string; person_id?: string; emoji?: string };
        setMsgs((prev) => prev.map((m) => (m.id === r.message_id ? { ...m, chat_reactions: m.chat_reactions.filter((x) => !(x.person_id === r.person_id && x.emoji === r.emoji)) } : m)));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, meId, lire]);

  // Non lus
  const nonLus = useMemo(() => {
    const m: Record<string, number> = {};
    for (const x of msgs) {
      if (x.author_id === meId) continue;
      const k = convOf(x);
      if (x.created_at > (reads[k] ?? bootNow)) m[k] = (m[k] ?? 0) + 1;
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, reads, bootNow, meId]);
  const total = Object.values(nonLus).reduce((s, n) => s + n, 0);

  // Titre de l'onglet : (n) devant le titre quand il y a des messages non lus
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total > 0 ? `(${total}) ${base}` : base;
  }, [total]);

  const nbConv = conv ? msgs.filter((m) => convOf(m) === conv).length : 0;

  // Défilement vers le bas
  useEffect(() => {
    fond.current?.scrollIntoView({ block: "end" });
  }, [open, conv, nbConv]);

  const envoyer = () => {
    if (!conv || !texte.trim() || pending) return;
    const cible = conv === "team" ? "team" : conv.slice(3);
    const t = texte;
    setErreur(null);
    start(async () => {
      const res = await envoyerMessage(cible, t);
      if (!res.ok) return setErreur(res.error);
      setTexte("");
      setMsgs((prev) => (prev.some((x) => x.id === res.data.id) ? prev : [...prev, res.data]));
    });
  };

  const reagirA = (id: string, emoji: string) => {
    setPicker(null);
    start(async () => {
      const res = await reagir(id, emoji);
      if (!res.ok) setErreur(res.error);
    });
  };
  const supprimer = (id: string) => {
    start(async () => {
      const res = await supprimerMessage(id);
      if (!res.ok) return setErreur(res.error);
      setMsgs((prev) => prev.filter((x) => x.id !== id));
    });
  };

  const dernier = (k: string) => [...msgs].reverse().find((m) => convOf(m) === k);
  const autres = people.filter((p) => p.id !== meId);
  const enLigne = autres.filter((p) => onlineIds.has(p.id));
  const horsLigne = autres.filter((p) => !onlineIds.has(p.id));
  const suivants = msgs.filter((m) => conv !== null && convOf(m) === conv);
  const titre = conv === "team" ? "Toute la team" : conv ? nom.get(conv.slice(3)) ?? "Message privé" : "Discussion";

  const ligne = (k: string, label: string, sousTitre?: string, point?: boolean) => {
    const d = dernier(k);
    return (
      <button onClick={() => { setConv(k); lire(k); }} className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-card-alt px-3 py-2 text-left hover:border-gold">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
            {point !== undefined && <span className={`inline-block h-2 w-2 rounded-full ${point ? "bg-[#1f8158]" : "bg-line"}`} />}
            {label}
          </span>
          <span className="block truncate text-[11px] text-muted">{d ? `${d.kind === "victoire" ? "🎉 " : ""}${d.body}` : (sousTitre ?? "Aucun message")}</span>
        </span>
        {(nonLus[k] ?? 0) > 0 && <span className="flex-shrink-0 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-night">{nonLus[k]}</span>}
      </button>
    );
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            if (conv) lire(conv);
          }}
          aria-label="Ouvrir la discussion"
          className="fixed bottom-36 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-gold bg-card text-gold-light shadow-lg md:bottom-20 md:right-6"
        >
          <MessageCircle size={22} />
          {total > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-[10px] font-bold text-night">{total}</span>}
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl md:inset-auto md:bottom-6 md:right-6 md:h-[560px] md:w-[380px] md:rounded-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              {conv && (
                <button onClick={() => setConv(null)} aria-label="Retour" className="rounded p-1 text-muted hover:bg-line">
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-ink">{titre}</div>
                <div className="text-[10px] text-muted">
                  {conv === "team" ? `${online.length} en ligne` : conv ? (onlineIds.has(conv.slice(3)) ? "En ligne" : "Hors ligne") : `${online.length} en ligne`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={basculerDnd} aria-label={dnd ? "Réactiver le son" : "Ne pas déranger"} title={dnd ? "Son coupé : réactiver" : "Ne pas déranger (couper le son)"} className="rounded p-1.5 text-muted hover:bg-line">
                {dnd ? <BellOff size={15} /> : <Bell size={15} />}
              </button>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="rounded p-1.5 text-muted hover:bg-line">
                <X size={16} />
              </button>
            </div>
          </div>

          {conv === null ? (
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
              {ligne("team", "Salon de la team", "Tout le monde peut lire et répondre")}
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">En ligne ({enLigne.length})</div>
              {enLigne.length === 0 && <div className="text-xs text-muted">Personne d&apos;autre en ligne pour l&apos;instant.</div>}
              {enLigne.map((p) => (
                <div key={p.id}>{ligne(`dm:${p.id}`, p.name, "Message privé", true)}</div>
              ))}
              {horsLigne.length > 0 && <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">Hors ligne</div>}
              {horsLigne.map((p) => (
                <div key={p.id}>{ligne(`dm:${p.id}`, p.name, "Message privé", false)}</div>
              ))}
              <p className="mt-2 text-[10px] text-muted">Messages gardés 90 jours. Pas de nom de client ni de promesse de rendement. Les messages privés ne sont lus que par vous deux.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2" onClick={() => setPicker(null)}>
                {suivants.length === 0 && <div className="m-auto text-center text-xs text-muted">{conv === "team" ? "Le salon est calme. Lance la discussion !" : "Aucun message pour l'instant. Dis bonjour !"}</div>}
                {suivants.map((m, i) => {
                  const moi = m.author_id === meId;
                  const veille = suivants[i - 1];
                  const nouveauJour = !veille || jourKey(veille.created_at) !== jourKey(m.created_at);
                  const groupes = EMOJIS.map((e) => ({ e, n: m.chat_reactions.filter((r) => r.emoji === e).length, moi: m.chat_reactions.some((r) => r.emoji === e && r.person_id === meId) })).filter((g) => g.n > 0);
                  return (
                    <div key={m.id} className="flex flex-col">
                      {nouveauJour && <div className="my-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted">{jourLabel(m.created_at)}</div>}
                      {m.kind === "victoire" ? (
                        <div className="rounded-xl border border-gold bg-card-alt px-3 py-2 text-center text-xs text-ink">
                          🎉 <b>{nom.get(m.author_id) ?? "Un membre de la team"}</b> {m.body}
                        </div>
                      ) : (
                        <div className={`group flex max-w-[88%] flex-col ${moi ? "items-end self-end" : "items-start self-start"}`}>
                          {!moi && conv === "team" && <span className="mb-0.5 px-1 text-[10px] font-bold text-muted">{nom.get(m.author_id) ?? "Ancien membre"}</span>}
                          <div className={`rounded-2xl px-3 py-1.5 text-sm ${moi ? "bg-gold text-night" : "border border-line bg-card-alt text-ink"}`}>
                            <span className="whitespace-pre-wrap break-words">{m.body}</span>
                            <span className={`ml-2 text-[9px] ${moi ? "text-night/60" : "text-muted"}`}>{heure(m.created_at)}</span>
                          </div>
                        </div>
                      )}
                      <div className={`mt-0.5 flex flex-wrap items-center gap-1 ${m.kind === "victoire" ? "justify-center" : moi ? "justify-end" : "justify-start"}`}>
                        {groupes.map((g) => (
                          <button key={g.e} onClick={() => reagirA(m.id, g.e)} className={`rounded-full border px-1.5 py-0.5 text-[11px] ${g.moi ? "border-gold bg-line" : "border-line bg-card-alt"}`}>
                            {g.e} {g.n}
                          </button>
                        ))}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPicker(picker === m.id ? null : m.id);
                          }}
                          aria-label="Réagir"
                          className="rounded-full p-1 text-muted hover:bg-line"
                        >
                          <SmilePlus size={13} />
                        </button>
                        {(m.author_id === meId || (isAdmin && m.recipient_id === null)) && (
                          <button onClick={() => supprimer(m.id)} aria-label="Supprimer le message" className="rounded-full p-1 text-muted hover:bg-line hover:text-[#e0836b]">
                            <Trash2 size={12} />
                          </button>
                        )}
                        {picker === m.id && (
                          <span className="flex gap-0.5 rounded-full border border-line bg-card px-1.5 py-0.5 shadow">
                            {EMOJIS.map((e) => (
                              <button key={e} onClick={() => reagirA(m.id, e)} className="px-0.5 text-base hover:scale-125">
                                {e}
                              </button>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={fond} />
              </div>
              <div className="border-t border-line p-2.5">
                {erreur && <div className="mb-1.5 rounded-lg border border-[#b3261e] px-2 py-1 text-[11px] text-[#e0836b]">{erreur}</div>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        envoyer();
                      }
                    }}
                    rows={1}
                    maxLength={1000}
                    placeholder={conv === "team" ? "Écris à toute la team…" : `Écris à ${titre}…`}
                    className="max-h-24 min-h-[38px] flex-1 resize-none rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  />
                  <button onClick={envoyer} disabled={pending || !texte.trim()} aria-label="Envoyer" className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-lg bg-gold text-night disabled:opacity-50">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
