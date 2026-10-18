"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { GROUPS, CLOSED_STATUSES, afterSend } from "@/lib/linkedin/status";
import { brusselsDate, fetchAllContacts } from "@/lib/linkedin/fetch";
import { normalize } from "@/lib/linkedin/classify";
import { resolveTemplate } from "@/lib/linkedin/templates";
import { stepFor } from "@/lib/linkedin/status";
import {
  DAILY_LIMIT,
  LINKEDIN_STATUSES,
  type LinkedinContact,
  type LinkedinGroup,
  type LinkedinStatus,
  type LinkedinTemplate,
} from "@/lib/linkedin/types";
import { ContactCard, type Outcome } from "./contact-card";
import { ImportPanel } from "./import-panel";

type TileFilter = "reply" | "due" | "priority" | "rdv" | null;
const PAGE_SIZE = 40;

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + n, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const PROSPECT_CATEGORY: Record<LinkedinGroup, "client" | "recrutement" | "prescripteur"> = {
  A: "prescripteur",
  B: "client",
  C: "prescripteur",
  D: "recrutement",
  E: "client",
  F: "client",
};

export function PipelineBoard({
  meId,
  meName,
  ownerId,
  ownerName,
  initialContacts,
  initialSentToday,
  calendlyUrl,
  templates,
  teamNames,
  viewOptions,
}: {
  meId: string;
  meName: string;
  ownerId: string;
  ownerName: string;
  initialContacts: LinkedinContact[];
  initialSentToday: number;
  calendlyUrl: string | null;
  templates: LinkedinTemplate[];
  teamNames: string[];
  viewOptions: { id: string; name: string }[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const readOnly = ownerId !== meId;
  const today = brusselsDate(new Date());

  const [contacts, setContacts] = useState(initialContacts);
  const [sentToday, setSentToday] = useState(initialSentToday);
  const [group, setGroup] = useState<LinkedinGroup | "ALL">("ALL");
  const [tile, setTile] = useState<TileFilter>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LinkedinStatus | "ALL">("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [forceId, setForceId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [calendly, setCalendly] = useState(calendlyUrl ?? "");
  const [savedCalendly, setSavedCalendly] = useState(calendlyUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);

  const isDue = (c: LinkedinContact) => c.next_action !== null && c.next_action <= today && !CLOSED_STATUSES.has(c.status);

  const counts = useMemo(
    () => ({
      reply: contacts.filter((c) => c.status === "À toi de répondre").length,
      due: contacts.filter(isDue).length,
      priority: contacts.filter((c) => c.priority === 1 && c.status === "À contacter").length,
      rdv: contacts.filter((c) => c.status === "RDV fixé").length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contacts, today]
  );

  const groupCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of contacts) m[c.grp] = (m[c.grp] ?? 0) + 1;
    return m;
  }, [contacts]);

  const visible = useMemo(() => {
    const q = normalize(search);
    const list = contacts.filter((c) => {
      if (group !== "ALL" && c.grp !== group) return false;
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (tile === "reply" && c.status !== "À toi de répondre") return false;
      if (tile === "due" && !isDue(c)) return false;
      if (tile === "priority" && !(c.priority === 1 && c.status === "À contacter")) return false;
      if (tile === "rdv" && c.status !== "RDV fixé") return false;
      if (q) {
        const hay = normalize(`${c.first_name} ${c.last_name} ${c.company ?? ""} ${c.position ?? ""} ${c.note}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const bucket = (c: LinkedinContact) => (c.status === "À toi de répondre" ? 0 : isDue(c) ? 1 : 2);
    return list.sort((a, b) => {
      if (bucket(a) !== bucket(b)) return bucket(a) - bucket(b);
      if (a.priority !== b.priority) return a.priority - b.priority;
      const an = a.next_action ?? "9999-12-31";
      const bn = b.next_action ?? "9999-12-31";
      if (an !== bn) return an < bn ? -1 : 1;
      return a.first_name.localeCompare(b.first_name, "fr");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, group, statusFilter, tile, search, today]);

  const groupInfo = group === "ALL" ? null : GROUPS.find((g) => g.code === group);

  const reload = async () => {
    setContacts(await fetchAllContacts(supabase, ownerId));
  };

  type EventSpec = string | { action: string; templateId: string | null };

  const logEvent = async (contactId: string, spec: EventSpec) => {
    const action = typeof spec === "string" ? spec : spec.action;
    const templateId = typeof spec === "string" ? null : spec.templateId;
    await supabase
      .from("linkedin_contact_events")
      .insert({ contact_id: contactId, owner_id: ownerId, action, ...(templateId ? { template_id: templateId } : {}) });
  };

  const patchContact = async (id: string, patch: Partial<LinkedinContact>, events: EventSpec[] = []) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from("linkedin_contacts").update(patch).eq("id", id);
    if (error) {
      setMessage(`Enregistrement impossible : ${error.message}`);
      await reload();
      return;
    }
    for (const spec of events) await logEvent(id, spec);
  };

  const send = async (c: LinkedinContact) => {
    const effect = afterSend(c.status);
    if (!effect) return;
    if (sentToday >= DAILY_LIMIT && forceId !== c.id) {
      setForceId(c.id);
      return;
    }
    setForceId(null);
    setSentToday((n) => n + 1);
    const step = stepFor(c.status, c.grp);
    const templateId = step ? (resolveTemplate(templates, ownerId, c.grp, step, c.tags)?.templateId ?? null) : null;
    const events: EventSpec[] = [{ action: "Message envoyé", templateId }];
    if (effect.status !== c.status) events.push(`Statut : ${effect.status}`);
    await patchContact(
      c.id,
      {
        status: effect.status,
        last_contact: today,
        next_action: effect.days ? addDays(today, effect.days) : null,
        msgs_sent: c.msgs_sent + 1,
      },
      events
    );
  };

  const outcome = async (c: LinkedinContact, o: Outcome) => {
    switch (o) {
      case "reply": {
        // La réponse est rattachée au dernier message envoyé à ce contact (taux de réponse par version)
        const { data: last } = await supabase
          .from("linkedin_contact_events")
          .select("template_id")
          .eq("contact_id", c.id)
          .eq("action", "Message envoyé")
          .order("created_at", { ascending: false })
          .limit(1);
        const templateId = (last?.[0] as { template_id: string | null } | undefined)?.template_id ?? null;
        await patchContact(
          c.id,
          { status: "À toi de répondre", next_action: today, last_contact: today, msgs_received: c.msgs_received + 1, priority: 1 },
          [{ action: "A répondu", templateId }, "Statut : À toi de répondre"]
        );
        break;
      }
      case "rdv":
        await patchContact(c.id, { status: "RDV fixé", next_action: null }, ["Statut : RDV fixé"]);
        break;
      case "client":
        await patchContact(c.id, { status: "Client / Partenaire", next_action: null }, ["Statut : Client / Partenaire"]);
        break;
      case "later":
        await patchContact(c.id, { status: "Plus tard", next_action: addDays(today, 90) }, ["Statut : Plus tard"]);
        break;
      case "notInterested":
        await patchContact(c.id, { status: "Pas intéressé", next_action: null }, ["Statut : Pas intéressé"]);
        break;
    }
  };

  const createProspect = async (c: LinkedinContact) => {
    const category = PROSPECT_CATEGORY[c.grp];
    const { data, error } = await supabase
      .from("prospects")
      .insert({
        owner_id: ownerId,
        name: `${c.first_name} ${c.last_name}`.trim(),
        source: "LinkedIn",
        notes: [c.position, c.company].filter(Boolean).join(" · ") + `\nProfil LinkedIn : ${c.linkedin_url}`,
        category,
        stage: category === "prescripteur" ? "Échange qualifié" : "RDV pris",
        priority: "B",
      })
      .select("id")
      .single();
    if (error || !data) {
      setMessage(`Création du prospect impossible : ${error?.message ?? "erreur inconnue"}`);
      return;
    }
    await patchContact(c.id, { prospect_id: data.id as string });
    setMessage(`Prospect créé (${category}) — retrouve-le dans Prospects.`);
  };

  const saveCalendly = async () => {
    const value = calendly.trim();
    if (value === savedCalendly) return;
    const { error } = await supabase.from("people").update({ calendly_url: value || null }).eq("id", meId);
    if (error) {
      setMessage(`Enregistrement du lien Calendly impossible : ${error.message}`);
      return;
    }
    setSavedCalendly(value);
    setMessage("Lien Calendly enregistré.");
  };

  const tiles: { key: Exclude<TileFilter, null>; label: string; color: string; value: number }[] = [
    { key: "reply", label: "À toi de répondre", color: "#d9534f", value: counts.reply },
    { key: "due", label: "Relances à faire", color: "#e08a3a", value: counts.due },
    { key: "priority", label: "Prioritaires à contacter", color: "#e0b93a", value: counts.priority },
    { key: "rdv", label: "RDV fixés", color: "#2fa56f", value: counts.rdv },
  ];

  const overLimit = sentToday >= DAILY_LIMIT;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">Pipeline LinkedIn</h2>
          <p className="mt-1 text-xs text-muted">
            {groupInfo
              ? `${groupInfo.code} · ${groupInfo.label} — ${groupInfo.help}`
              : `${contacts.length} relation${contacts.length > 1 ? "s" : ""}${readOnly ? ` — pipeline de ${ownerName}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <Link href="/linkedin/messages" className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink">
              Mes messages
            </Link>
          )}
        {viewOptions.length > 1 && (
          <select
            value={ownerId}
            onChange={(e) => router.push(e.target.value === meId ? "/linkedin" : `/linkedin?de=${e.target.value}`)}
            className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-ink outline-none focus:border-gold"
          >
            {viewOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id === meId ? "Mon pipeline" : o.name}
              </option>
            ))}
          </select>
        )}
        </div>
      </div>

      <div
        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-xs"
        style={{ background: "rgba(245,205,84,0.12)", borderColor: "rgba(245,205,84,0.4)" }}
      >
        <span className="text-ink">
          Tu envoies <strong>toi-même</strong>, au maximum <strong>{DAILY_LIMIT} messages par jour</strong>.
        </span>
        <span className={`font-bold ${overLimit ? "text-red" : "text-gold-light"}`}>
          Aujourd&apos;hui : {sentToday} / {DAILY_LIMIT}
        </span>
      </div>

      {message && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-muted">
            Fermer
          </button>
        </div>
      )}

      {!readOnly && (
        <>
          <ImportPanel
            ownerId={ownerId}
            existingUrls={new Set(contacts.map((c) => c.linkedin_url))}
            teamNames={teamNames}
            onImported={reload}
          />
          <div className="mb-3 flex items-center gap-2">
            <input
              value={calendly}
              onChange={(e) => setCalendly(e.target.value)}
              onBlur={saveCalendly}
              placeholder="Mon lien Calendly (https://calendly.com/…) — utilisé dans les messages"
              className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
          </div>
        </>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTile((cur) => (cur === t.key ? null : t.key));
              setShown(PAGE_SIZE);
            }}
            className={`rounded-2xl border bg-card p-3 text-left ${tile === t.key ? "border-gold" : "border-line"}`}
          >
            <div className="text-[11px] text-muted">{t.label}</div>
            <div className="font-serif text-2xl font-semibold" style={{ color: t.color }}>
              {t.value}
            </div>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {([{ code: "ALL" as const, label: "Tous", n: contacts.length }] as { code: LinkedinGroup | "ALL"; label: string; n: number }[])
          .concat(GROUPS.map((g) => ({ code: g.code, label: `${g.code} · ${g.label}`, n: groupCounts[g.code] ?? 0 })))
          .map((g) => (
            <button
              key={g.code}
              onClick={() => {
                setGroup(g.code);
                setShown(PAGE_SIZE);
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                group === g.code ? "border-gold bg-line text-gold-light" : "border-line text-muted"
              }`}
            >
              {g.label} <span className="ml-0.5 text-ink">{g.n}</span>
            </button>
          ))}
      </div>

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-2 text-muted" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShown(PAGE_SIZE);
            }}
            placeholder="Nom, entreprise, poste, note…"
            className="w-full rounded-lg border border-line bg-card py-1.5 pl-8 pr-3 text-xs text-ink outline-none focus:border-gold"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as LinkedinStatus | "ALL");
            setShown(PAGE_SIZE);
          }}
          className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-ink outline-none focus:border-gold"
        >
          <option value="ALL">Tous les statuts</option>
          {LINKEDIN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          {readOnly
            ? "Ce collaborateur n'a pas encore importé ses relations."
            : "Aucune relation pour l'instant. Importe ton fichier Connections.csv pour commencer."}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucune relation ne correspond à ces filtres.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-muted">
            {visible.length} relation{visible.length > 1 ? "s" : ""}
          </div>
          {visible.slice(0, shown).map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              today={today}
              open={openId === c.id}
              readOnly={readOnly}
              sentToday={sentToday}
              forcing={forceId === c.id}
              collaboratorName={ownerId === meId ? meName : ownerName}
              calendlyUrl={ownerId === meId ? savedCalendly || null : null}
              templates={templates}
              ownerId={ownerId}
              onToggle={() => {
                setOpenId((cur) => (cur === c.id ? null : c.id));
                setForceId(null);
              }}
              onSend={() => send(c)}
              onOutcome={(o) => outcome(c, o)}
              onPatch={(patch, eventAction) => patchContact(c.id, patch, eventAction ? [eventAction] : [])}
              onCreateProspect={() => createProspect(c)}
            />
          ))}
          {visible.length > shown && (
            <button
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="rounded-lg border border-line bg-card px-3 py-2 text-xs font-bold text-ink"
            >
              Afficher plus ({visible.length - shown} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
