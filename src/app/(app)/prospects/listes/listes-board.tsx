"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { MessageCircle, Phone, Share2, Users } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { CallButton } from "@/components/call-button";
import { modifierProspectListe, partagerListe, retirerPartage } from "./actions";

type Role = "owner" | "edit" | "read";

export interface ListeCard {
  id: string;
  name: string;
  role: Role;
  ownerName: string;
  count: number;
  sharedWith: number;
}
export interface ListeProspect {
  id: string;
  name: string;
  phone: string | null;
  stage: string;
  notes: string | null;
  next_follow_up: string | null;
  calls: number;
}
export interface ShareRow {
  personId: string;
  name: string;
  canEdit: boolean;
}
export interface ListeDetail {
  card: ListeCard;
  prospects: ListeProspect[];
  shares: ShareRow[];
  candidates: { id: string; name: string }[];
}

const STAGES = ["À contacter", "Contacté", "Répondu", "RDV pris", "Entretien / Dossier", "Perdu"];
const STAGE_COLOR: Record<string, string> = {
  "À contacter": "#8a97b0",
  Contacté: "#5a6b85",
  Répondu: "var(--color-gold-light)",
  "RDV pris": "#c99a3f",
  "Entretien / Dossier": "#1f8158",
  Perdu: "#b3543a",
};
const ROLE_LABEL: Record<Role, string> = { owner: "Ma liste", edit: "Partagée · modification", read: "Partagée · lecture" };

const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50";

const digits = (s: string | null) => (s ?? "").replace(/[^\d+]/g, "");

function Row({ p, canEdit, onChange }: { p: ListeProspect; canEdit: boolean; onChange: (id: string, patch: Partial<ListeProspect>) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(p.notes ?? "");
  const [date, setDate] = useState(p.next_follow_up ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const num = digits(p.phone);

  const setStage = (stage: string) =>
    start(async () => {
      const res = await modifierProspectListe(p.id, { stage });
      if (!res.ok) return setMsg(res.error);
      setMsg(null);
      onChange(p.id, { stage });
    });
  const saveNote = () =>
    start(async () => {
      const res = await modifierProspectListe(p.id, { notes: note, next_follow_up: date || null });
      if (!res.ok) return setMsg(res.error);
      setMsg("Enregistré.");
      onChange(p.id, { notes: note.trim() || null, next_follow_up: date || null });
    });

  return (
    <div className="rounded-xl border border-line bg-card-alt px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{p.name}</div>
          <div className="flex flex-wrap items-center gap-2 text-muted">
            {p.phone && (
              <>
                <a href={`tel:${num}`} className="flex items-center gap-1 text-gold-light underline">
                  <Phone size={11} /> {p.phone}
                </a>
                <a href={`https://wa.me/${num.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gold-light underline">
                  <MessageCircle size={11} /> WhatsApp
                </a>
              </>
            )}
            {p.next_follow_up && <span>· relance le {fmtDate(p.next_follow_up)}</span>}
            {p.calls > 0 && <span>· {p.calls} appel{p.calls > 1 ? "s" : ""}</span>}
          </div>
        </div>
        {canEdit ? (
          <select value={p.stage} disabled={pending} onChange={(e) => setStage(e.target.value)} className={`${inputCls} font-bold`} style={{ color: STAGE_COLOR[p.stage] }}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-bold" style={{ color: STAGE_COLOR[p.stage] }}>
            {p.stage}
          </span>
        )}
        {canEdit && <CallButton prospectId={p.id} onLogged={(stage, nextFollowUp) => onChange(p.id, { stage, next_follow_up: nextFollowUp, calls: p.calls + 1 })} />}
        <button onClick={() => setOpen((o) => !o)} className={ghostBtn}>
          {p.notes ? "Note ●" : "Note"}
        </button>
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          <textarea value={note} readOnly={!canEdit} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Note sur ce contact" className={`${inputCls} w-full`} />
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-muted">
                Relance le <input type="date" value={date} min="2020-01-01" max="2100-12-31" onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </label>
              <button disabled={pending} onClick={saveNote} className={goldBtn}>
                Enregistrer
              </button>
            </div>
          )}
        </div>
      )}
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

function SharePanel({ detail }: { detail: ListeDetail }) {
  const [shares, setShares] = useState(detail.shares);
  const [person, setPerson] = useState("");
  const [canEdit, setCanEdit] = useState(true);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const free = detail.candidates.filter((c) => !shares.some((s) => s.personId === c.id));
  const listId = detail.card.id;

  const add = () =>
    start(async () => {
      const res = await partagerListe(listId, person, canEdit);
      if (!res.ok) return setMsg(res.error);
      const name = detail.candidates.find((c) => c.id === person)?.name ?? "?";
      setShares((s) => [...s, { personId: person, name, canEdit }]);
      setPerson("");
      setMsg(`Liste partagée avec ${name}.`);
    });
  const toggle = (s: ShareRow) =>
    start(async () => {
      const res = await partagerListe(listId, s.personId, !s.canEdit);
      if (!res.ok) return setMsg(res.error);
      setShares((cur) => cur.map((x) => (x.personId === s.personId ? { ...x, canEdit: !s.canEdit } : x)));
    });
  const remove = (s: ShareRow) =>
    start(async () => {
      const res = await retirerPartage(listId, s.personId);
      if (!res.ok) return setMsg(res.error);
      setShares((cur) => cur.filter((x) => x.personId !== s.personId));
      setMsg(`Partage retiré pour ${s.name}.`);
    });

  return (
    <div className="mb-3 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
        <Share2 size={14} /> Partager cette liste
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={person} onChange={(e) => setPerson(e.target.value)} className={inputCls}>
          <option value="">Choisir une personne…</option>
          {free.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={canEdit ? "edit" : "read"} onChange={(e) => setCanEdit(e.target.value === "edit")} className={inputCls}>
          <option value="edit">Peut modifier (étape, notes, relance)</option>
          <option value="read">Lecture seule</option>
        </select>
        <button disabled={pending || !person} onClick={add} className={goldBtn}>
          Partager
        </button>
      </div>
      {shares.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {shares.map((s) => (
            <div key={s.personId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card-alt px-2.5 py-1.5 text-xs">
              <span className="font-bold text-ink">{s.name}</span>
              <span className="flex items-center gap-2">
                <button disabled={pending} onClick={() => toggle(s)} className={ghostBtn}>
                  {s.canEdit ? "Peut modifier" : "Lecture seule"} (changer)
                </button>
                <button disabled={pending} onClick={() => remove(s)} className={ghostBtn}>
                  Retirer
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted">
        La personne voit cette liste dans « Listes de prospects ». Elle n&apos;entre pas dans ses propres prospects ni dans ses statistiques. Tu peux retirer le partage à tout moment.
      </p>
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

export function ListesBoard({ cards, detail, role }: { cards: ListeCard[]; detail: ListeDetail | null; role: Role }) {
  const [rows, setRows] = useState(detail?.prospects ?? []);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("Tous");
  const [limit, setLimit] = useState(60);
  const canEdit = role === "owner" || role === "edit";

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (stage === "Tous" || r.stage === stage) && (!t || r.name.toLowerCase().includes(t) || (r.phone ?? "").replace(/\s/g, "").includes(t.replace(/\s/g, ""))));
  }, [rows, q, stage]);
  const counts = useMemo(() => rows.reduce<Record<string, number>>((m, r) => ((m[r.stage] = (m[r.stage] ?? 0) + 1), m), {}), [rows]);

  const onChange = (id: string, patch: Partial<ListeProspect>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  if (!detail) {
    return (
      <div className="flex flex-col gap-2">
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">Aucune liste pour l&apos;instant. Les listes importées ou partagées avec toi apparaîtront ici.</div>
        ) : (
          cards.map((c) => (
            <Link key={c.id} href={`/prospects/listes?liste=${c.id}`} className="rounded-2xl border border-line bg-card p-3.5 transition hover:border-gold">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-ink">{c.name}</div>
                <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] font-bold text-gold-light">{ROLE_LABEL[c.role]}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span>{c.count} contacts</span>
                {c.role === "owner" ? (
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {c.sharedWith === 0 ? "pas encore partagée" : `partagée avec ${c.sharedWith} personne${c.sharedWith > 1 ? "s" : ""}`}
                  </span>
                ) : (
                  <span>de {c.ownerName}</span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/prospects/listes" className="text-xs font-bold text-gold-light underline">
            ← Toutes les listes
          </Link>
          <div className="mt-1 text-base font-bold text-ink">{detail.card.name}</div>
          <div className="text-xs text-muted">
            {ROLE_LABEL[role]}
            {role !== "owner" ? ` · de ${detail.card.ownerName}` : ""} · {rows.length} contacts
          </div>
        </div>
      </div>

      {role === "owner" && <SharePanel detail={detail} />}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => (setQ(e.target.value), setLimit(60))} placeholder="Chercher un nom ou un numéro" className={`${inputCls} min-w-[200px] flex-1`} />
        <select value={stage} onChange={(e) => (setStage(e.target.value), setLimit(60))} className={inputCls}>
          <option value="Tous">Toutes les étapes ({rows.length})</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s} ({counts[s] ?? 0})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        {shown.slice(0, limit).map((p) => (
          <Row key={p.id} p={p} canEdit={canEdit} onChange={onChange} />
        ))}
        {shown.length === 0 && <div className="text-xs text-muted">Aucun contact ne correspond.</div>}
        {shown.length > limit && (
          <button onClick={() => setLimit((l) => l + 60)} className={ghostBtn}>
            Voir 60 de plus ({shown.length - limit} restants)
          </button>
        )}
      </div>
    </div>
  );
}
