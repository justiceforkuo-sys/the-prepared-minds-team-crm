"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR } from "@/lib/format";
import { IARD_PRODUCTS, VIE_PRODUCTS } from "@/lib/commission-products";
import { KNOWN_PARTNERS } from "@/lib/decompte-deadline";
import type { Client, ClientPolicy, PolicyStatus, Rank } from "@/types/database";

type Category = "iard" | "vie";

const POLICY_STATUSES: PolicyStatus[] = ["Actif", "Arrêté", "Racheté", "En pause"];
const POLICY_STATUS_COLOR: Record<PolicyStatus, string> = {
  Actif: "#3f7d5c",
  "Arrêté": "#b3543a",
  "Racheté": "#8a97ab",
  "En pause": "#c99a3f",
};

const PARTNER_OPTIONS = [...KNOWN_PARTNERS, "Autre"];

const emptyPolicyForm = {
  category: "iard" as Category,
  productId: IARD_PRODUCTS[0].id,
  vieProductId: VIE_PRODUCTS[0].id,
  amount: "",
  manual: false,
  manualUnits: "",
  partner: KNOWN_PARTNERS[0],
  partnerOther: "",
  followupDate: "",
};

function nextReminderDueDate(): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 6);
  return target.toISOString().slice(0, 10);
}

interface PersonLite {
  id: string;
  name: string;
  rank: Rank;
  active: boolean;
}

type ClientWithPolicies = Client & { client_policies: ClientPolicy[] };

export function ClientsBoard({ me, downline }: { me: PersonLite; downline: PersonLite[] }) {
  const supabase = createClient();
  const visiblePeople = [me, ...downline];

  const [activeId, setActiveId] = useState(me.id);
  const [clients, setClients] = useState<ClientWithPolicies[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const activePerson = visiblePeople.find((p) => p.id === activeId) ?? me;
  const canEdit = activeId === me.id;

  const [policyFormId, setPolicyFormId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState(emptyPolicyForm);

  const iardProduct = IARD_PRODUCTS.find((p) => p.id === policyForm.productId) ?? IARD_PRODUCTS[0];
  const vieProduct = VIE_PRODUCTS.find((p) => p.id === policyForm.vieProductId) ?? VIE_PRODUCTS[0];
  const amountNum = parseFloat(policyForm.amount.replace(",", ".")) || 0;
  const computedUnits = useMemo(() => {
    if (policyForm.category === "iard") return (amountNum / 1000) * iardProduct.perThousand;
    return vieProduct.basis === "capital" ? (amountNum / 1000) * vieProduct.factor : amountNum * vieProduct.factor;
  }, [policyForm.category, amountNum, iardProduct, vieProduct]);
  const finalUnits = policyForm.manual ? parseFloat(policyForm.manualUnits.replace(",", ".")) || 0 : computedUnits;
  const productLabel = policyForm.category === "iard" ? iardProduct.label : vieProduct.label;

  const togglePolicyForm = (clientId: string) => {
    setPolicyFormId((prev) => (prev === clientId ? null : clientId));
    setPolicyForm(emptyPolicyForm);
  };

  const recomputeClientTotals = async (clientId: string, policies: ClientPolicy[]) => {
    const total_worth = policies.reduce((s, p) => s + p.worth, 0);
    const total_units = policies.reduce((s, p) => s + p.units, 0);
    await supabase.from("clients").update({ total_worth, total_units }).eq("id", clientId);
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, total_worth, total_units } : c)));
  };

  const addPolicy = async (clientId: string) => {
    if (!policyForm.manual && amountNum <= 0) return;
    if (policyForm.manual && !policyForm.manualUnits) return;
    if (!policyForm.followupDate) return;
    const client = clients.find((c) => c.id === clientId);
    const partner = policyForm.partner === "Autre" ? policyForm.partnerOther.trim() || null : policyForm.partner;
    const { data } = await supabase
      .from("client_policies")
      .insert({
        client_id: clientId,
        partner,
        product: policyForm.category === "iard" ? iardProduct.id : vieProduct.id,
        product_label: productLabel,
        worth: amountNum,
        units: Math.round(finalUnits * 100) / 100,
        followup_date: policyForm.followupDate,
      })
      .select()
      .single();
    if (data && client) {
      const policies = [...client.client_policies, data as ClientPolicy];
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, client_policies: policies } : c)));
      recomputeClientTotals(clientId, policies);
      await supabase.from("tasks").insert({
        assigned_by: me.id,
        assigned_to: me.id,
        title: `Vérifier le prélèvement — ${client.name} (${productLabel})`,
        notes: partner ? `Contrat ${partner}, ajouté le ${new Date().toLocaleDateString("fr-BE")}` : null,
        due_date: nextReminderDueDate(),
      });
    }
    setPolicyFormId(null);
    setPolicyForm(emptyPolicyForm);
  };

  const updatePolicyStatus = async (clientId: string, policyId: string, policy_status: PolicyStatus) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, client_policies: c.client_policies.map((p) => (p.id === policyId ? { ...p, policy_status } : p)) }
          : c
      )
    );
    await supabase.from("client_policies").update({ policy_status }).eq("id", policyId);
  };

  const deletePolicy = async (clientId: string, policyId: string) => {
    const client = clients.find((c) => c.id === clientId);
    await supabase.from("client_policies").delete().eq("id", policyId);
    if (client) {
      const policies = client.client_policies.filter((p) => p.id !== policyId);
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, client_policies: policies } : c)));
      recomputeClientTotals(clientId, policies);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("clients")
      .select("*, client_policies(*)")
      .eq("owner_id", activeId)
      .order("name")
      .then(({ data }) => {
        if (!cancelled) {
          setClients((data as ClientWithPolicies[]) ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const addClient = async () => {
    if (!newName.trim()) return;
    const { data } = await supabase
      .from("clients")
      .insert({ owner_id: me.id, name: newName.trim() })
      .select("*, client_policies(*)")
      .single();
    if (data) setClients((prev) => [...prev, data as ClientWithPolicies].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setShowAdd(false);
  };

  const deleteClient = async (id: string) => {
    await supabase.from("clients").delete().eq("id", id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Clients</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Ton book, celui de tes recrues directes, et l&apos;historique de tes anciens collaborateurs.
      </p>

      {downline.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {visiblePeople.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={`rounded-lg border px-3 py-2 text-center text-xs ${
                activeId === p.id ? "border-gold bg-line" : "border-line bg-card-alt"
              } ${p.active === false ? "opacity-50" : ""}`}
            >
              <div className={`font-bold ${activeId === p.id ? "text-gold-light" : "text-ink"}`}>
                {p.name}
                {p.active === false ? " (inactif)" : ""}
              </div>
              <div className="text-[10px] text-muted">{p.rank}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-ink">
          {activePerson.name} <span className="font-normal text-muted">— {activePerson.rank}</span>
        </div>
        <div className="text-xs text-muted">{clients.length} clients</div>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="flex-1 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
        />
        {canEdit && (
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-night"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {showAdd && canEdit && (
        <div className="mb-3 flex gap-2 rounded-2xl border border-line bg-card p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du nouveau client"
            className="flex-1 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
          <button onClick={addClient} className="rounded-lg bg-gold px-3 py-2 text-sm font-bold text-night">
            Ajouter
          </button>
        </div>
      )}

      {loading && <div className="text-sm text-muted">Chargement...</div>}
      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucun client ne correspond à cette recherche.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((c) => {
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="flex flex-1 items-center justify-between text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink">{c.name}</span>
                      {c.status === "Prospect" && (
                        <span className="rounded-full bg-[#5a6b85] px-2 py-0.5 text-[10px] font-bold text-night">
                          Prospect
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {c.client_policies.length} police{c.client_policies.length > 1 ? "s" : ""}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                </button>
                {canEdit && (
                  <button onClick={() => deleteClient(c.id)} className="ml-2 p-1">
                    <Trash2 size={14} className="text-red" />
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
                  {(c.email || c.address || c.locality) && (
                    <div className="mb-1 text-xs text-muted">
                      {c.email && <div>{c.email}</div>}
                      {(c.address || c.locality) && <div>{[c.address, c.locality].filter(Boolean).join(", ")}</div>}
                    </div>
                  )}
                  {c.client_policies.length === 0 && (
                    <div className="text-xs text-muted">Aucune police enregistrée.</div>
                  )}
                  {c.client_policies.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <div className="text-ink">
                        {p.product_label}
                        {p.partner ? <span className="text-muted"> · {p.partner}</span> : null}
                        <span className="text-muted"> · {p.units} u</span>
                      </div>
                      <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                        {p.worth > 0 && <span className="text-muted">{fmtEUR(p.worth)}</span>}
                        <select
                          value={p.policy_status}
                          disabled={!canEdit}
                          onChange={(e) => updatePolicyStatus(c.id, p.id, e.target.value as PolicyStatus)}
                          className="rounded-md border border-line bg-card-alt px-1.5 py-1 text-[10px] font-bold outline-none focus:border-gold disabled:opacity-70"
                          style={{ color: POLICY_STATUS_COLOR[p.policy_status] }}
                        >
                          {POLICY_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {canEdit && (
                          <button onClick={() => deletePolicy(c.id, p.id)}>
                            <Trash2 size={12} className="text-red" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {canEdit && (
                    <div className="mt-1.5">
                      <button
                        onClick={() => togglePolicyForm(c.id)}
                        className="flex items-center gap-1 text-xs font-bold text-gold-light"
                      >
                        <Plus size={13} /> Ajouter une solution
                      </button>
                    </div>
                  )}

                  {canEdit && policyFormId === c.id && (
                    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-line bg-card-alt p-3">
                      <div className="flex gap-2">
                        {(["iard", "vie"] as const).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setPolicyForm((f) => ({ ...f, category: cat }))}
                            className={`flex-1 rounded-md border px-2 py-1 text-xs font-bold ${
                              policyForm.category === cat
                                ? "border-gold bg-line text-gold-light"
                                : "border-line text-muted"
                            }`}
                          >
                            {cat === "iard" ? "IARD" : "Vie"}
                          </button>
                        ))}
                      </div>

                      {policyForm.category === "iard" ? (
                        <select
                          value={policyForm.productId}
                          onChange={(e) => setPolicyForm((f) => ({ ...f, productId: e.target.value }))}
                          className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                        >
                          {IARD_PRODUCTS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label} ({p.perThousand} u/1000)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={policyForm.vieProductId}
                          onChange={(e) => setPolicyForm((f) => ({ ...f, vieProductId: e.target.value }))}
                          className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                        >
                          {VIE_PRODUCTS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      )}

                      <select
                        value={policyForm.partner}
                        onChange={(e) => setPolicyForm((f) => ({ ...f, partner: e.target.value }))}
                        className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      >
                        {PARTNER_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      {policyForm.partner === "Autre" && (
                        <input
                          value={policyForm.partnerOther}
                          onChange={(e) => setPolicyForm((f) => ({ ...f, partnerOther: e.target.value }))}
                          placeholder="Nom du partenaire"
                          className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                        />
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={policyForm.amount}
                          onChange={(e) => setPolicyForm((f) => ({ ...f, amount: e.target.value }))}
                          placeholder={
                            policyForm.category === "iard"
                              ? "Prime annuelle (€)"
                              : vieProduct.basis === "capital"
                                ? "Capital assuré (€)"
                                : "Prime mensuelle (€)"
                          }
                          className="flex-1 rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                        />
                        <span className="flex-shrink-0 text-xs text-muted">
                          {policyForm.manual ? "—" : `${computedUnits.toFixed(2)} u`}
                        </span>
                      </div>

                      <label className="flex items-center gap-1.5 text-[11px] text-muted">
                        <input
                          type="checkbox"
                          checked={policyForm.manual}
                          onChange={(e) => setPolicyForm((f) => ({ ...f, manual: e.target.checked }))}
                        />
                        Saisir les unités manuellement
                      </label>

                      {policyForm.manual && (
                        <input
                          type="number"
                          min={0}
                          value={policyForm.manualUnits}
                          onChange={(e) => setPolicyForm((f) => ({ ...f, manualUnits: e.target.value }))}
                          placeholder="Unités"
                          className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                        />
                      )}

                      <div>
                        <label className="mb-1 block text-[10px] text-muted">
                          Date de suivi / décompte avec le client (obligatoire)
                        </label>
                        <input
                          type="date"
                          value={policyForm.followupDate}
                          onChange={(e) => setPolicyForm((f) => ({ ...f, followupDate: e.target.value }))}
                          className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => addPolicy(c.id)}
                          disabled={!policyForm.followupDate}
                          className="flex-1 rounded-md bg-gold py-1.5 text-xs font-bold text-night disabled:opacity-50"
                        >
                          Enregistrer ({finalUnits.toFixed(2)} u)
                        </button>
                        <button
                          onClick={() => setPolicyFormId(null)}
                          className="rounded-md border border-line px-3 py-1.5 text-xs text-muted"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
