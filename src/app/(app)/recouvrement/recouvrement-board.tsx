"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR } from "@/lib/format";
import { daysUntilCutoff } from "@/lib/decompte-deadline";
import type { ClientPolicy, PaymentStatus, FeedbackReason } from "@/types/database";

type PolicyRow = ClientPolicy & { client: { name: string; owner_id: string } | null };

const STATUSES: PaymentStatus[] = [
  "À contacter",
  "Appelé 1x",
  "Appelé 2x",
  "Appelé 3x + vocal",
  "Promesse (partiel)",
  "Mise en réduction (contrat gelé)",
  "Rachat (clôture du contrat)",
  "Payé",
];
const STATUS_COLOR: Record<PaymentStatus, string> = {
  "À contacter": "#5a6b85",
  "Appelé 1x": "#8a97ab",
  "Appelé 2x": "#c99a3f",
  "Appelé 3x + vocal": "#b8923f",
  "Promesse (partiel)": "#6d3fb8",
  "Mise en réduction (contrat gelé)": "#2f5fa8",
  "Rachat (clôture du contrat)": "#b3543a",
  Payé: "#3f7d5c",
};
const FEEDBACK_REASONS: FeedbackReason[] = [
  "Feedback direction/compagnie",
  "Injoignable / coordonnées KO",
  "Autre (voir note)",
];

type OwnClientPolicy = { id: string; product_label: string | null; worth: number; payment_status: PaymentStatus | null };
type OwnClient = { id: string; name: string; client_policies: OwnClientPolicy[] };

export function RecouvrementBoard({
  meId,
  isAdmin,
  initialPolicies,
}: {
  meId: string;
  isAdmin: boolean;
  initialPolicies: PolicyRow[];
}) {
  const supabase = createClient();
  const [policies, setPolicies] = useState(initialPolicies);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showFlagForm, setShowFlagForm] = useState(false);
  const [ownClients, setOwnClients] = useState<OwnClient[] | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [unpaidInput, setUnpaidInput] = useState("1");

  const sorted = useMemo(
    () => [...policies].sort((a, b) => (b.unpaid_installments ?? 0) - (a.unpaid_installments ?? 0)),
    [policies]
  );

  const openFlagForm = async () => {
    setShowFlagForm((s) => !s);
    if (ownClients === null) {
      const { data } = await supabase
        .from("clients")
        .select("id, name, client_policies(id, product_label, worth, payment_status)")
        .eq("owner_id", meId);
      setOwnClients((data as OwnClient[]) ?? []);
    }
  };

  const flaggablePolicies = (ownClients ?? []).flatMap((c) =>
    c.client_policies
      .filter((p) => !p.payment_status)
      .map((p) => ({
        id: p.id,
        label: `${c.name} — ${p.product_label ?? "Police"} (${fmtEUR(p.worth)})`,
      }))
  );

  const submitFlag = async () => {
    if (!selectedPolicyId) return;
    const { data } = await supabase
      .from("client_policies")
      .update({
        payment_status: "À contacter",
        unpaid_installments: Math.max(1, parseInt(unpaidInput, 10) || 1),
      })
      .eq("id", selectedPolicyId)
      .select("*, client:clients(name, owner_id)")
      .single();
    if (data) setPolicies((prev) => [data as PolicyRow, ...prev]);
    setOwnClients(
      (prev) =>
        prev?.map((c) => ({
          ...c,
          client_policies: c.client_policies.filter((p) => p.id !== selectedPolicyId),
        })) ?? null
    );
    setSelectedPolicyId("");
    setUnpaidInput("1");
    setShowFlagForm(false);
  };

  const updatePolicy = async (id: string, patch: Partial<ClientPolicy>) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from("client_policies").update(patch).eq("id", id);
  };

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink">Recouvrement</h2>
        <button
          onClick={openFlagForm}
          className="flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night"
        >
          <Plus size={16} /> Signaler un impayé
        </button>
      </div>
      <p className="mb-4 mt-1 text-xs text-muted">
        Contrats dont le client ne paie plus ou n&apos;a pas signé/payé — un suivi par contrat.
      </p>

      {showFlagForm && (
        <div className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-3.5">
          {ownClients === null ? (
            <div className="text-sm text-muted">Chargement...</div>
          ) : flaggablePolicies.length === 0 ? (
            <div className="text-sm text-muted">Aucune police disponible à signaler.</div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs text-muted">Contrat</label>
                <select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                >
                  <option value="">— choisir —</option>
                  {flaggablePolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Mensualités impayées</label>
                <input
                  type="number"
                  min={1}
                  value={unpaidInput}
                  onChange={(e) => setUnpaidInput(e.target.value)}
                  className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />
              </div>
              <button
                disabled={!selectedPolicyId}
                onClick={submitFlag}
                className="mt-1 rounded-lg bg-gold py-2 text-sm font-bold text-night disabled:opacity-50"
              >
                Signaler
              </button>
            </>
          )}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucun contrat signalé pour l&apos;instant.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((p) => {
          const isOpen = expanded === p.id;
          const canEdit = isAdmin || p.client?.owner_id === meId;
          const status = (p.payment_status ?? "À contacter") as PaymentStatus;
          const daysLeft = p.partner && status !== "Payé" ? daysUntilCutoff(p.partner) : null;
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-line bg-card p-3.5"
              style={{ borderLeft: `3px solid ${STATUS_COLOR[status]}` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  {p.unpaid_installments !== null && (
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red text-[11px] font-extrabold text-night">
                      {p.unpaid_installments}
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-bold text-ink">{p.client?.name ?? "?"}</div>
                    <div className="text-xs text-muted">
                      {p.product_label} · {fmtEUR(p.worth)}
                    </div>
                  </div>
                  {daysLeft !== null && (
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-night"
                      style={{ background: daysLeft <= 3 ? "#b3543a" : daysLeft <= 7 ? "#c99a3f" : "#8a97ab" }}
                    >
                      {daysLeft <= 0 ? "Échéance dépassée" : `J-${daysLeft}`}
                    </span>
                  )}
                </div>
                {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
              </button>

              {isOpen && (
                <div className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3 text-xs">
                  <select
                    value={status}
                    disabled={!canEdit}
                    onChange={(e) => updatePolicy(p.id, { payment_status: e.target.value as PaymentStatus })}
                    className="rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs font-bold outline-none focus:border-gold disabled:opacity-60"
                    style={{ color: STATUS_COLOR[status] }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-4">
                    {(["call_1_done", "call_2_done", "call_3_done"] as const).map((key, i) => (
                      <label key={key} className="flex items-center gap-1.5 text-ink">
                        <input
                          type="checkbox"
                          checked={p[key]}
                          disabled={!canEdit}
                          onChange={(e) => updatePolicy(p.id, { [key]: e.target.checked })}
                        />
                        M{i + 1}
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] text-muted">Mensualités impayées</label>
                    <input
                      type="number"
                      min={0}
                      value={p.unpaid_installments ?? 0}
                      disabled={!canEdit}
                      onChange={(e) => updatePolicy(p.id, { unpaid_installments: parseInt(e.target.value, 10) || 0 })}
                      className="w-24 rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] text-muted">Motif</label>
                    <select
                      value={p.feedback_reason ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => updatePolicy(p.id, { feedback_reason: (e.target.value || null) as FeedbackReason | null })}
                      className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold disabled:opacity-60"
                    >
                      <option value="">—</option>
                      {FEEDBACK_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] text-muted">Précision</label>
                    <input
                      value={p.precision_note ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => updatePolicy(p.id, { precision_note: e.target.value })}
                      placeholder="Ex : payé le 2/8..."
                      className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold disabled:opacity-60"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
