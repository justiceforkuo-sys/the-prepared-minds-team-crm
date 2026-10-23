"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import type { DealStage } from "@/types/database";
import { DEAL_STAGE_COLOR, monthLabel } from "@/lib/units";
import { PAID_STAGES, PENDING_STAGES, pctLabel, pvq1 } from "@/lib/pvq";
import { fmtDate } from "@/lib/format";
import { changerEtape, type Etape } from "./actions";

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

const goldBtn = "flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-ink disabled:opacity-50";

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

function ContractList({
  title,
  hint,
  rows,
  names,
  isAdmin,
  actions,
  onAct,
  pending,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  rows: DecompteRow[];
  names: Record<string, string>;
  isAdmin: boolean;
  actions: { etape: Etape; label: string; primary?: boolean; icon: "ok" | "no" | "back" }[];
  onAct: (ids: string[], etape: Etape) => void;
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
                <select value={owner} onChange={(e) => (setOwner(e.target.value), setSel(new Set()))} className="rounded-md border border-line bg-card-alt px-2 py-1 text-xs text-ink">
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
              <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto text-xs">
                {shown.map((r) => (
                  <label key={r.id} className="flex items-start gap-2 rounded-lg border border-line bg-card-alt px-2 py-1.5">
                    {isAdmin && <input type="checkbox" className="mt-0.5" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />}
                    <span className="min-w-0 flex-1">
                      <span className="font-bold text-ink">{r.client_name}</span>
                      <span className="text-muted"> · {r.product_label ?? "Contrat"}{r.partner ? ` · ${r.partner}` : ""}</span>
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
                  </label>
                ))}
              </div>
            </>
          )}
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
}: {
  month: string;
  monthOptions: string[];
  rows: DecompteRow[];
  names: Record<string, string>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
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

  const act = (ids: string[], etape: Etape) =>
    start(async () => {
      const res = await changerEtape(ids, etape, month);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      const stage: DealStage = etape === "decompte" ? "Décompté" : etape === "non_paiement" ? "Non paiement" : "Contrat signé";
      const set = new Set(ids);
      setRows((rs) => rs.map((r) => (set.has(r.id) ? { ...r, deal_stage: stage, decompte_month: etape === "decompte" ? month : null } : r)));
      setMsg(`${res.count} contrat(s) mis à jour.`);
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">Décomptes et PVQ1</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            Un contrat est <strong className="text-ink">décompté</strong> quand il est saisi et que son premier paiement est confirmé : le collaborateur touche alors dessus. Le{" "}
            <strong className="text-ink">PVQ1</strong> mesure la part des contrats saisis dont le premier paiement a bien été effectué.
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
              <div key={o.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg bg-card-alt px-2.5 py-1.5">
                <span className="truncate font-bold text-ink">{o.name}</span>
                <span className="text-muted">
                  {o.p.paid}/{o.p.entered} contrats
                </span>
                <span className="text-muted">{units(o.p.unitsPaid)} u décomptées</span>
                <span className="w-12 text-right font-bold text-ink">{pctLabel(o.p.pct)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && <div className="rounded-lg border border-gold px-3 py-1.5 text-xs text-ink">{msg}</div>}

      <ContractList
        title="À vérifier : premier paiement"
        hint={isAdmin ? "Coche les contrats dont le premier paiement est confirmé, puis valide-les : ils sont décomptés sur ce mois." : "Contrats saisis dont le premier paiement n'est pas encore confirmé."}
        rows={toVerify}
        names={names}
        isAdmin={isAdmin}
        actions={[
          { etape: "decompte", label: "1er paiement reçu : décompter", primary: true, icon: "ok" },
          { etape: "non_paiement", label: "Non payé", icon: "no" },
        ]}
        onAct={act}
        pending={pending}
      />
      <ContractList
        title="Non paiement"
        hint="Le premier paiement n'a pas eu lieu. Ces contrats sont suivis dans Recouvrement."
        rows={unpaid}
        names={names}
        isAdmin={isAdmin}
        actions={[
          { etape: "decompte", label: "Payé : décompter", primary: true, icon: "ok" },
          { etape: "a_verifier", label: "Remettre à vérifier", icon: "back" },
        ]}
        onAct={act}
        pending={pending}
        defaultOpen={unpaid.length > 0}
      />
      <ContractList
        title="Décomptés"
        hint="Premier paiement confirmé : le collaborateur touche sur ces contrats."
        rows={paid}
        names={names}
        isAdmin={isAdmin}
        actions={[{ etape: "a_verifier", label: "Annuler le décompte", icon: "back" }]}
        onAct={act}
        pending={pending}
        defaultOpen={false}
      />
    </div>
  );
}
