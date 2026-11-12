"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { dialHref } from "@/components/call-button";

export const RELATIONS = ["Ami", "Famille", "Collègue", "Voisin", "Ancien camarade", "Connaissance", "Client", "Autre"];
export const ETATS_CIVILS = ["Célibataire", "En couple", "Cohabitant(e)", "Marié(e)", "Divorcé(e)", "Veuf / veuve"];
export const TYPES_ACTION = ["DV", "DR", "AR"] as const;

type TypeAction = (typeof TYPES_ACTION)[number];

export interface Reco {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  recommended_by: string | null;
  relation: string | null;
  etat_civil: string | null;
  travail: "oui" | "non" | null;
  region: string | null;
  remarque: string | null;
  type_action: TypeAction | null;
  commentaire: string | null;
  contact_date: string | null;
  created_at: string;
}

type Field = keyof Omit<Reco, "id" | "owner_id" | "created_at">;

const TYPE_COLOR: Record<TypeAction, string> = { DV: "#3f7d5c", DR: "#5a6b85", AR: "#c99a3f" };

const cell = "border-b border-line px-1.5 py-1 align-top";
const input =
  "w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink outline-none focus:border-gold focus:bg-card-alt read-only:cursor-default";

/**
 * Tableau des recommandations : une ligne par personne recommandée, comme dans la feuille de suivi
 * (nom, numéro, recommandé par, relation, état civil, travail, région, remarque, DV/DR/AR, commentaire, date).
 * Chaque case s'enregistre en la quittant. Seul le propriétaire modifie ; le sponsor direct lit.
 */
export function RecommandationsTable({ ownerId, canEdit }: { ownerId: string; canEdit: boolean }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Reco[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeAction | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("recommandations")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at")
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError("Impossible de charger les recommandations.");
        setRows((data as Reco[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const save = async (id: string, field: Field, raw: string) => {
    const value = field === "name" ? raw.trim() : raw.trim() === "" ? null : raw.trim();
    const patch = { [field]: value } as Partial<Reco>;
    const current = rows.find((r) => r.id === id);
    if (!current || (current[field] ?? null) === value) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error: err } = await supabase.from("recommandations").update(patch).eq("id", id);
    setError(err ? "L'enregistrement a échoué, réessaie." : "");
  };

  const add = async () => {
    const { data, error: err } = await supabase
      .from("recommandations")
      .insert({ owner_id: ownerId })
      .select("*")
      .single();
    if (err || !data) {
      setError("Impossible d'ajouter une ligne.");
      return;
    }
    setRows((prev) => [...prev, data as Reco]);
  };

  const remove = async (r: Reco) => {
    if (!window.confirm(`Supprimer la ligne${r.name ? ` « ${r.name} »` : ""} ?`)) return;
    await supabase.from("recommandations").delete().eq("id", r.id);
    setRows((prev) => prev.filter((x) => x.id !== r.id));
  };

  const counts = useMemo(() => {
    const c: Record<TypeAction, number> = { DV: 0, DR: 0, AR: 0 };
    for (const r of rows) if (r.type_action) c[r.type_action]++;
    return c;
  }, [rows]);

  const q = search.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!typeFilter || r.type_action === typeFilter) &&
      (!q ||
        [r.name, r.phone, r.recommended_by, r.region, r.remarque, r.commentaire].some((v) => (v ?? "").toLowerCase().includes(q))),
  );

  const text = (r: Reco, field: Field, placeholder = "") => (
    <input
      key={`${r.id}-${field}-${r[field] ?? ""}`}
      defaultValue={(r[field] as string | null) ?? ""}
      readOnly={!canEdit}
      placeholder={canEdit ? placeholder : ""}
      onBlur={(e) => save(r.id, field, e.target.value)}
      className={input}
    />
  );

  const select = (r: Reco, field: Field, options: string[], empty = "—") => (
    <select
      value={(r[field] as string | null) ?? ""}
      disabled={!canEdit}
      onChange={(e) => save(r.id, field, e.target.value)}
      className={`${input} appearance-none`}
    >
      <option value="">{empty}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <p className="mb-3 text-xs text-muted">
        Une ligne par personne recommandée : qui te la recommande, quelle relation, ce que tu sais d&apos;elle, et ce que tu lui proposes
        (DV, DR ou AR). Chaque case s&apos;enregistre quand tu la quittes.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, numéro, recommandé par, région…)"
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
        />
        {canEdit && (
          <button onClick={add} className="flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-night">
            <Plus size={16} /> Ligne
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setTypeFilter("")}
          className={`rounded-lg border px-3 py-1.5 font-bold ${typeFilter === "" ? "border-gold bg-line text-gold-light" : "border-line bg-card-alt text-muted"}`}
        >
          Toutes · {rows.length}
        </button>
        {TYPES_ACTION.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? "" : t)}
            className={`rounded-lg border px-3 py-1.5 font-bold ${typeFilter === t ? "border-gold bg-line text-gold-light" : "border-line bg-card-alt text-muted"}`}
          >
            {t} · {counts[t]}
          </button>
        ))}
      </div>

      {error && <div className="mb-3 rounded-lg border border-[#b3543a] px-3 py-2 text-xs text-[#e0836b]">{error}</div>}
      {loading && <div className="text-sm text-muted">Chargement...</div>}

      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucune recommandation pour l&apos;instant.{canEdit ? " Ajoute une ligne avec le bouton « Ligne »." : ""}
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-card-alt text-[10px] uppercase tracking-wide text-muted">
                {["Nom", "Numéro de téléphone", "Recommandé par", "Relation avec reco", "État civil", "Travail", "Région", "Remarque", "DV / DR / AR", "Commentaires après contact", "Date", ""].map(
                  (h, i) => (
                    <th key={i} className="border-b border-line px-2 py-2 font-bold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const href = dialHref(r.phone);
                return (
                  <tr key={r.id} className="hover:bg-card-alt/50">
                    <td className={`${cell} min-w-[140px]`}>{text(r, "name", "Nom")}</td>
                    <td className={`${cell} min-w-[140px]`}>
                      <div className="flex items-center gap-1">
                        {text(r, "phone", "04xx xx xx xx")}
                        {href && (
                          <a href={href} aria-label="Appeler" className="flex-shrink-0 rounded p-1 text-gold-light hover:bg-line">
                            <Phone size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className={`${cell} min-w-[120px]`}>{text(r, "recommended_by", "Recommandé par")}</td>
                    <td className={`${cell} min-w-[110px]`}>{select(r, "relation", RELATIONS)}</td>
                    <td className={`${cell} min-w-[110px]`}>{select(r, "etat_civil", ETATS_CIVILS)}</td>
                    <td className={`${cell} min-w-[80px]`}>
                      <select
                        value={r.travail ?? ""}
                        disabled={!canEdit}
                        onChange={(e) => save(r.id, "travail", e.target.value)}
                        className={`${input} appearance-none`}
                      >
                        <option value="">—</option>
                        <option value="oui">Oui</option>
                        <option value="non">Non</option>
                      </select>
                    </td>
                    <td className={`${cell} min-w-[100px]`}>{text(r, "region", "Région")}</td>
                    <td className={`${cell} min-w-[120px]`}>{text(r, "remarque", "Remarque")}</td>
                    <td className={`${cell} min-w-[80px]`}>
                      <select
                        value={r.type_action ?? ""}
                        disabled={!canEdit}
                        onChange={(e) => save(r.id, "type_action", e.target.value)}
                        style={r.type_action ? { color: TYPE_COLOR[r.type_action], fontWeight: 700 } : undefined}
                        className={`${input} appearance-none`}
                      >
                        <option value="">—</option>
                        {TYPES_ACTION.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={`${cell} min-w-[200px]`}>{text(r, "commentaire", "Commentaire")}</td>
                    <td className={`${cell} min-w-[120px]`}>
                      <input
                        type="date"
                        key={`${r.id}-date-${r.contact_date ?? ""}`}
                        defaultValue={r.contact_date ?? ""}
                        readOnly={!canEdit}
                        onBlur={(e) => save(r.id, "contact_date", e.target.value)}
                        className={input}
                      />
                    </td>
                    <td className={`${cell} w-8 text-center`}>
                      {canEdit && (
                        <button onClick={() => remove(r)} aria-label="Supprimer la ligne" className="rounded p-1 text-muted hover:bg-line hover:text-[#e0836b]">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-4 text-center text-muted">
                    Aucune ligne ne correspond.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
