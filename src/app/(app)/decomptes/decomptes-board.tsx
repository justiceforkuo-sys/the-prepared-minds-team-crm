"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, FileCheck2, Paperclip, Pencil, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { DealStage } from "@/types/database";
import { DEAL_STAGE_COLOR, monthLabel } from "@/lib/units";
import { PAID_STAGES, PENDING_STAGES, pctLabel, pvq1 } from "@/lib/pvq";
import { fmtDate } from "@/lib/format";
import { ajusterPvq1, changerEtape, enregistrerPreuve, liensPreuves, preparerEnvoiPreuve, type Etape, type PreuveLien } from "./actions";

export interface DecompteRow {
  id: string;
  client_name: string;
  owner_id: string;
  product_label: string | null;
  partner: string | null;
  units: number;
  worth: number;
  deal_stage: DealStage;
  signed_on: string | null;
  decompte_month: string | null;
}

type Ajustement = { pct: number; note: string | null };

const goldBtn = "flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink disabled:opacity-50";
const inputCls = "rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink outline-none focus:border-gold";

const units = (n: number) => (Math.round(n * 10) / 10).toLocaleString("fr-BE");

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-serif text-2xl font-semibold" style={{ color: tone }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

/** Preuves de paiement d'un contrat : voir, joindre (et décompter). */
function RowProof({
  row,
  month,
  count,
  canAct,
  isAdmin,
  onDone,
}: {
  row: DecompteRow;
  month: string;
  count: number;
  canAct: boolean;
  isAdmin: boolean;
  onDone: (id: string, stage: DealStage | null, proofAdded: boolean) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [links, setLinks] = useState<PreuveLien[] | null>(null);
  const [open, setOpen] = useState(false);
  const paid = PAID_STAGES.includes(row.deal_stage);

  const voir = () =>
    start(async () => {
      if (links) {
        setLinks(null);
        return;
      }
      const res = await liensPreuves(row.id);
      if (!res.ok) setMsg(res.error);
      else setLinks(res.items);
    });

  const envoyer = (decompter: boolean) =>
    start(async () => {
      const f = fileRef.current?.files?.[0];
      if (!f) {
        setMsg("Choisis d'abord un fichier (PDF ou photo).");
        return;
      }
      setMsg("Envoi…");
      const prep = await preparerEnvoiPreuve(row.id, f.name, f.type, f.size);
      if (!prep.ok) return setMsg(prep.error);
      const up = await supabase.storage.from("payment-proofs").uploadToSignedUrl(prep.path, prep.token, f, { contentType: f.type });
      if (up.error) return setMsg(up.error.message);
      const res = await enregistrerPreuve(row.id, prep.path, f.name, f.type, f.size, decompter, month);
      if (!res.ok) return setMsg(res.error);
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
      setMsg(decompter ? "Preuve enregistrée : contrat décompté." : "Preuve enregistrée.");
      setLinks(null);
      onDone(row.id, decompter ? "Décompté" : null, true);
    });

  const etape = (e: Etape) =>
    start(async () => {
      const res = await changerEtape([row.id], e, month);
      if (!res.ok) return setMsg(res.error);
      setMsg(null);
      onDone(row.id, e === "decompte" ? "Décompté" : e === "non_paiement" ? "Non paiement" : "Contrat signé", false);
    });

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {count > 0 && (
          <button disabled={pending} onClick={voir} className={ghostBtn}>
            <FileCheck2 size={12} /> Preuve{count > 1 ? `s (${count})` : ""}
          </button>
        )}
        {canAct && !paid && (
          <button disabled={pending} onClick={() => setOpen((o) => !o)} className={ghostBtn}>
            <Paperclip size={12} /> Joindre la preuve de paiement
          </button>
        )}
        {canAct && !paid && row.deal_stage !== "Non paiement" && (
          <button disabled={pending} onClick={() => etape("non_paiement")} className={ghostBtn}>
            <XCircle size={12} /> Non payé
          </button>
        )}
        {canAct && paid && (
          <button disabled={pending} onClick={() => etape("a_verifier")} className={ghostBtn}>
            Remettre à vérifier
          </button>
        )}
        {canAct && paid && (
          <button disabled={pending} onClick={() => setOpen((o) => !o)} className={ghostBtn}>
            <Paperclip size={12} /> Ajouter une preuve
          </button>
        )}
        {canAct && !paid && isAdmin && count > 0 && (
          <button disabled={pending} onClick={() => etape("decompte")} className={ghostBtn}>
            <CheckCircle2 size={12} /> Décompter
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-card p-2">
          <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/heic" className="max-w-[220px] text-[11px] text-ink" />
          {!paid ? (
            <button disabled={pending} onClick={() => envoyer(true)} className={goldBtn}>
              Envoyer et décompter
            </button>
          ) : (
            <button disabled={pending} onClick={() => envoyer(false)} className={goldBtn}>
              Envoyer
            </button>
          )}
          {!paid && isAdmin && (
            <button disabled={pending} onClick={() => envoyer(false)} className={ghostBtn}>
              Envoyer sans décompter
            </button>
          )}
          <span className="basis-full text-[10px] text-muted">PDF ou photo du paiement (virement, extrait de compte…), 10 Mo maximum.</span>
        </div>
      )}
      {links && (
        <div className="flex flex-col gap-0.5 rounded-lg border border-line bg-card p-2 text-[11px]">
          {links.length === 0 ? (
            <span className="text-muted">Aucune preuve.</span>
          ) : (
            links.map((l) => (
              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold text-gold-light underline">
                {l.filename} <span className="font-normal text-muted">· {fmtDate(l.created_at)}{l.by ? ` · ${l.by}` : ""}</span>
              </a>
            ))
          )}
        </div>
      )}
      {msg && <div className="text-[11px] text-ink">{msg}</div>}
    </div>
  );
}

function ContractList({
  title,
  hint,
  rows,
  names,
  isAdmin,
  meId,
  month,
  proofs,
  actions,
  onAct,
  onRowDone,
  pending,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  rows: DecompteRow[];
  names: Record<string, string>;
  isAdmin: boolean;
  meId: string;
  month: string;
  proofs: Record<string, number>;
  actions: { etape: Etape; label: string; primary?: boolean; icon: "ok" | "no" | "back" }[];
  onAct: (ids: string[], etape: Etape) => void;
  onRowDone: (id: string, stage: DealStage | null, proofAdded: boolean) => void;
  pending: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [owner, setOwner] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const owners = useMemo(() => [...new Set(rows.map((r) => r.owner_id))].sort((a, b) => (names[a] ?? "").localeCompare(names[b] ?? "")), [rows, names]);
  const shown = rows.filter((r) => !owner || r.owner_id === owner);
  const selected = shown.filter((r) => sel.has(r.id)).map((r) => r.id);
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = shown.length > 0 && selected.length === shown.length;
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="text-sm font-bold text-ink">{title}</span> <span className="text-xs text-muted">· {rows.length} contrat{rows.length > 1 ? "s" : ""}</span>
        </span>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>
      {open && (
        <div className="mt-2">
          {hint && <div className="mb-2 text-[11px] text-muted">{hint}</div>}
          {rows.length === 0 ? (
            <div className="text-xs text-muted">Aucun contrat.</div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <select value={owner} onChange={(e) => (setOwner(e.target.value), setSel(new Set()))} className={inputCls}>
                  <option value="">Tous les collaborateurs</option>
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {names[o] ?? "—"}
                    </option>
                  ))}
                </select>
                {isAdmin && (
                  <>
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" checked={allSelected} onChange={() => setSel(allSelected ? new Set() : new Set(shown.map((r) => r.id)))} />
                      Tout sélectionner ({shown.length})
                    </label>
                    {actions.map((a) => (
                      <button
                        key={a.etape}
                        disabled={pending || selected.length === 0}
                        onClick={() => {
                          onAct(selected, a.etape);
                          setSel(new Set());
                        }}
                        className={a.primary ? goldBtn : ghostBtn}
                      >
                        {a.icon === "ok" ? <CheckCircle2 size={13} /> : a.icon === "no" ? <XCircle size={13} /> : null}
                        {a.label} ({selected.length})
                      </button>
                    ))}
                  </>
                )}
              </div>
              <div className="flex max-h-[460px] flex-col gap-1 overflow-y-auto text-xs">
                {shown.map((r) => (
                  <div key={r.id} className="rounded-lg border border-line bg-card-alt px-2 py-1.5">
                    <div className="flex items-start gap-2">
                      {isAdmin && <input type="checkbox" className="mt-0.5" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />}
                      <span className="min-w-0 flex-1">
                        <span className="font-bold text-ink">{r.client_name}</span>
                        <span className="text-muted">
                          {" "}
                          · {r.product_label ?? "Contrat"}
                          {r.partner ? ` · ${r.partner}` : ""}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {names[r.owner_id] ?? "—"}
                          {r.signed_on ? ` · signé le ${fmtDate(r.signed_on)}` : ""}
                          {r.decompte_month ? ` · décompté ${monthLabel(r.decompte_month)}` : ""}
                        </span>
                      </span>
                      <span className="flex-shrink-0 text-right">
                        <span className="font-bold text-ink">{units(r.units)} u</span>
                        <span className="block text-[10px] font-bold" style={{ color: DEAL_STAGE_COLOR[r.deal_stage] }}>
                          {r.deal_stage}
                        </span>
                      </span>
                    </div>
                    <RowProof row={r} month={month} count={proofs[r.id] ?? 0} canAct={isAdmin || r.owner_id === meId} isAdmin={isAdmin} onDone={onRowDone} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Ligne PVQ1 d'un collaborateur, avec la correction manuelle pour les administrateurs. */
function OwnerPvqRow({
  userId,
  name,
  p,
  month,
  adj,
  isAdmin,
  onAdjusted,
}: {
  userId: string;
  name: string;
  p: ReturnType<typeof pvq1>;
  month: string;
  adj: Ajustement | undefined;
  isAdmin: boolean;
  onAdjusted: (userId: string, a: Ajustement | null) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [pct, setPct] = useState(adj ? String(adj.pct) : p.pct === null ? "" : String(Math.round(p.pct * 100)));
  const [note, setNote] = useState(adj?.note ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const save = (retirer: boolean) =>
    start(async () => {
      const value = retirer ? null : Number(pct.replace(",", "."));
      if (!retirer && (pct.trim() === "" || !Number.isFinite(value))) return setMsg("Entre un pourcentage.");
      const res = await ajusterPvq1(userId, month, value, note);
      if (!res.ok) return setMsg(res.error);
      onAdjusted(userId, retirer ? null : { pct: value as number, note: note.trim() || null });
      setEdit(false);
      setMsg(null);
    });
  return (
    <div className="rounded-lg bg-card-alt px-2.5 py-1.5">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3">
        <span className="truncate font-bold text-ink">{name}</span>
        <span className="text-muted">
          {p.paid}/{p.entered} contrats
        </span>
        <span className="text-muted">{units(p.unitsPaid)} u décomptées</span>
        <span className="min-w-14 text-right font-bold text-ink">
          {adj ? (
            <>
              {Math.round(adj.pct)} %<span className="block text-[10px] font-normal text-gold-light">ajusté (calculé : {pctLabel(p.pct)})</span>
            </>
          ) : (
            pctLabel(p.pct)
          )}
        </span>
        {isAdmin ? (
          <button onClick={() => setEdit((e) => !e)} title="Ajuster le PVQ1" className="text-muted hover:text-gold-light">
            <Pencil size={13} />
          </button>
        ) : (
          <span />
        )}
      </div>
      {adj?.note && !edit && <div className="mt-0.5 text-[10px] text-muted">Note : {adj.note}</div>}
      {edit && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <input value={pct} inputMode="decimal" onChange={(e) => setPct(e.target.value)} className={`${inputCls} w-16`} />
          <span className="text-muted">%</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Raison de l'ajustement" className={`${inputCls} min-w-[160px] flex-1`} />
          <button disabled={pending} onClick={() => save(false)} className={goldBtn}>
            Enregistrer
          </button>
          {adj && (
            <button disabled={pending} onClick={() => save(true)} className={ghostBtn}>
              Retirer l&apos;ajustement
            </button>
          )}
          {msg && <span className="text-[11px] text-ink">{msg}</span>}
        </div>
      )}
    </div>
  );
}

export function DecomptesBoard({
  month,
  monthOptions,
  rows: initial,
  names,
  isAdmin,
  meId,
  proofs: initialProofs,
  ajustements: initialAdj,
}: {
  month: string;
  monthOptions: string[];
  rows: DecompteRow[];
  names: Record<string, string>;
  isAdmin: boolean;
  meId: string;
  proofs: Record<string, number>;
  ajustements: Record<string, Ajustement>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [proofs, setProofs] = useState(initialProofs);
  const [adj, setAdj] = useState(initialAdj);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const total = useMemo(() => pvq1(rows), [rows]);
  const byOwner = useMemo(() => {
    const m = new Map<string, DecompteRow[]>();
    for (const r of rows) m.set(r.owner_id, [...(m.get(r.owner_id) ?? []), r]);
    return [...m.entries()]
      .map(([id, rs]) => ({ id, name: names[id] ?? "—", p: pvq1(rs) }))
      .filter((x) => x.p.entered > 0)
      .sort((a, b) => b.p.pending - a.p.pending || a.name.localeCompare(b.name));
  }, [rows, names]);

  const toVerify = rows.filter((r) => PENDING_STAGES.includes(r.deal_stage));
  const unpaid = rows.filter((r) => r.deal_stage === "Non paiement");
  const paid = rows.filter((r) => PAID_STAGES.includes(r.deal_stage));

  const applyStage = (ids: string[], stage: DealStage) => {
    const set = new Set(ids);
    setRows((rs) => rs.map((r) => (set.has(r.id) ? { ...r, deal_stage: stage, decompte_month: stage === "Décompté" ? month : null } : r)));
  };

  const act = (ids: string[], etape: Etape) =>
    start(async () => {
      const res = await changerEtape(ids, etape, month);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      applyStage(ids, etape === "decompte" ? "Décompté" : etape === "non_paiement" ? "Non paiement" : "Contrat signé");
      setMsg(`${res.count} contrat(s) mis à jour.`);
    });

  const rowDone = (id: string, stage: DealStage | null, proofAdded: boolean) => {
    if (stage) applyStage([id], stage);
    if (proofAdded) setProofs((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  };

  const listProps = { names, isAdmin, meId, month, proofs, onAct: act, onRowDone: rowDone, pending };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">Décomptes et PVQ1</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            Un contrat est <strong className="text-ink">décompté</strong> quand il est saisi et que son premier paiement est confirmé : le collaborateur touche alors dessus. Le{" "}
            <strong className="text-ink">PVQ1</strong> mesure la part des contrats saisis dont le premier paiement a bien été effectué.
            {!isAdmin && " Pour décompter un de tes contrats, joins la preuve du paiement."}
          </p>
        </div>
        <select value={month} onChange={(e) => router.push(`/decomptes?mois=${e.target.value}`)} className="rounded-md border border-line bg-card px-2 py-1.5 text-sm capitalize text-ink">
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="PVQ1 (contrats)" value={pctLabel(total.pct)} sub={`${total.paid} payés sur ${total.entered} saisis`} tone="var(--color-gold-light)" />
        <Kpi label="PVQ1 (unités)" value={pctLabel(total.pctUnits)} sub={`${units(total.unitsPaid)} sur ${units(total.unitsEntered)} u`} tone="var(--color-gold-light)" />
        <Kpi label="À vérifier" value={String(total.pending)} sub={`${units(total.unitsPending)} u en attente du 1er paiement`} />
        <Kpi label="Non paiement" value={String(total.unpaid)} sub="1er paiement non effectué" tone={total.unpaid > 0 ? "#b3543a" : undefined} />
      </div>

      {byOwner.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <div className="mb-2 text-sm font-bold text-ink">PVQ1 par collaborateur</div>
          <div className="flex flex-col gap-1 text-xs">
            {byOwner.map((o) => (
              <OwnerPvqRow
                key={o.id}
                userId={o.id}
                name={o.name}
                p={o.p}
                month={month}
                adj={adj[o.id]}
                isAdmin={isAdmin}
                onAdjusted={(uid, a) =>
                  setAdj((cur) => {
                    const n = { ...cur };
                    if (a) n[uid] = a;
                    else delete n[uid];
                    return n;
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {msg && <div className="rounded-lg border border-gold px-3 py-1.5 text-xs text-ink">{msg}</div>}

      <ContractList
        title="À vérifier : premier paiement"
        hint={
          isAdmin
            ? "Coche les contrats dont le premier paiement est confirmé, puis valide-les : ils sont décomptés sur ce mois. Chaque contrat accepte une preuve de paiement."
            : "Contrats saisis dont le premier paiement n'est pas encore confirmé. Joins la preuve du paiement pour décompter un de tes contrats."
        }
        rows={toVerify}
        actions={[
          { etape: "decompte", label: "1er paiement reçu : décompter", primary: true, icon: "ok" },
          { etape: "non_paiement", label: "Non payé", icon: "no" },
        ]}
        {...listProps}
      />
      <ContractList
        title="Non paiement"
        hint="Le premier paiement n'a pas eu lieu. Ces contrats sont suivis dans Recouvrement. Joins la preuve du paiement quand il est effectué."
        rows={unpaid}
        actions={[
          { etape: "decompte", label: "Payé : décompter", primary: true, icon: "ok" },
          { etape: "a_verifier", label: "Remettre à vérifier", icon: "back" },
        ]}
        defaultOpen={unpaid.length > 0}
        {...listProps}
      />
      <ContractList
        title="Décomptés"
        hint="Premier paiement confirmé : le collaborateur touche sur ces contrats. Tu peux ajouter une preuve ou remettre un de tes contrats à vérifier."
        rows={paid}
        actions={[{ etape: "a_verifier", label: "Annuler le décompte", icon: "back" }]}
        defaultOpen={false}
        {...listProps}
      />
    </div>
  );
}
