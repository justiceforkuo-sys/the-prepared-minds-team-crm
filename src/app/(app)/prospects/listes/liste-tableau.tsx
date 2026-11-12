"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { CallButton } from "@/components/call-button";
import { modifierProspectListe, type ProspectPatch } from "./actions";
import type { ListeProspect } from "./listes-board";

export const TYPES_ACTION = ["DV", "DR", "AR"] as const;
const TYPE_COLOR: Record<string, string> = { DV: "#3f7d5c", DR: "#5a6b85", AR: "#c99a3f" };
const RELATIONS = ["Ami", "Famille", "Collègue", "Voisin", "Ancien camarade", "Connaissance", "Client"];
const ETATS_CIVILS = ["Célibataire", "En couple", "Cohabitant(e)", "Marié(e)", "Divorcé(e)", "Veuf / veuve"];
const STAGES = ["À contacter", "Contacté", "Répondu", "RDV pris", "Entretien / Dossier", "Perdu"];

type TextField = "recommended_by" | "relation" | "etat_civil" | "travail" | "region" | "remarque" | "commentaire";

const cell = "border-b border-line px-1.5 py-1 align-top";
const input =
  "w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink outline-none focus:border-gold focus:bg-card-alt read-only:cursor-default";

const digits = (s: string | null) => (s ?? "").replace(/[^\d+]/g, "");

function TableRow({
  p,
  canEdit,
  onChange,
  onError,
}: {
  p: ListeProspect;
  canEdit: boolean;
  onChange: (id: string, patch: Partial<ListeProspect>) => void;
  onError: (m: string) => void;
}) {
  const [pending, start] = useTransition();
  const num = digits(p.phone);

  const save = (patch: ProspectPatch, local: Partial<ListeProspect>) =>
    start(async () => {
      const res = await modifierProspectListe(p.id, patch);
      if (!res.ok) return onError(res.error);
      onError("");
      onChange(p.id, local);
    });

  const text = (field: TextField, placeholder: string, list?: string) => (
    <input
      key={`${field}-${p[field] ?? ""}`}
      defaultValue={p[field] ?? ""}
      readOnly={!canEdit}
      list={list}
      placeholder={canEdit ? placeholder : ""}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v === (p[field] ?? "")) return;
        save({ [field]: v } as ProspectPatch, { [field]: v || null } as Partial<ListeProspect>);
      }}
      className={input}
    />
  );

  return (
    <tr className={pending ? "opacity-60" : "hover:bg-card-alt/50"}>
      <td className={`${cell} min-w-[150px] text-xs font-bold text-ink`}>
        <div className="px-1.5 py-1">{p.name}</div>
      </td>
      <td className={`${cell} min-w-[140px]`}>
        <div className="flex items-center gap-1 px-1.5 py-1 text-xs">
          {p.phone ? (
            <>
              <a href={`tel:${num}`} className="whitespace-nowrap text-gold-light underline">
                {p.phone}
              </a>
              <a href={`https://wa.me/${num.replace("+", "")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex-shrink-0 text-gold-light">
                <MessageCircle size={12} />
              </a>
            </>
          ) : (
            <span className="text-muted">—</span>
          )}
        </div>
      </td>
      <td className={`${cell} min-w-[120px]`}>{text("recommended_by", "Recommandé par")}</td>
      <td className={`${cell} min-w-[120px]`}>{text("relation", "Relation", "dl-relations")}</td>
      <td className={`${cell} min-w-[120px]`}>{text("etat_civil", "État civil", "dl-etats")}</td>
      <td className={`${cell} min-w-[90px]`}>{text("travail", "Travail")}</td>
      <td className={`${cell} min-w-[100px]`}>{text("region", "Région")}</td>
      <td className={`${cell} min-w-[120px]`}>{text("remarque", "Remarque")}</td>
      <td className={`${cell} min-w-[80px]`}>
        <select
          value={p.type_action ?? ""}
          disabled={!canEdit}
          onChange={(e) => {
            const v = (e.target.value || null) as ListeProspect["type_action"];
            save({ type_action: v }, { type_action: v });
          }}
          style={p.type_action ? { color: TYPE_COLOR[p.type_action], fontWeight: 700 } : undefined}
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
      <td className={`${cell} min-w-[200px]`}>{text("commentaire", "Commentaire après contact")}</td>
      <td className={`${cell} min-w-[125px]`}>
        <input
          type="date"
          key={`date-${p.contact_date ?? ""}`}
          defaultValue={p.contact_date ?? ""}
          readOnly={!canEdit}
          min="2020-01-01"
          max="2100-12-31"
          onBlur={(e) => {
            const v = e.target.value || null;
            if (v === (p.contact_date ?? null)) return;
            save({ contact_date: v }, { contact_date: v });
          }}
          className={input}
        />
      </td>
      <td className={`${cell} min-w-[130px]`}>
        <select
          value={p.stage}
          disabled={!canEdit || pending}
          onChange={(e) => save({ stage: e.target.value }, { stage: e.target.value })}
          className={`${input} appearance-none font-bold`}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className={`${cell} min-w-[110px]`}>
        {canEdit && (
          <CallButton
            prospectId={p.id}
            phone={p.phone}
            onLogged={(stage, nextFollowUp) => onChange(p.id, { stage, next_follow_up: nextFollowUp, calls: p.calls + 1 })}
          />
        )}
      </td>
    </tr>
  );
}

/**
 * Vue « Tableau » d'une liste : une ligne par prospect avec les colonnes de la feuille de suivi
 * (nom, numéro, recommandé par, relation, état civil, travail, région, remarque, DV/DR/AR, commentaire, date).
 * Chaque case s'enregistre en la quittant, avec le droit de modification de la liste.
 */
export function ListeTableau({
  rows,
  canEdit,
  onChange,
}: {
  rows: ListeProspect[];
  canEdit: boolean;
  onChange: (id: string, patch: Partial<ListeProspect>) => void;
}) {
  const [error, setError] = useState("");
  return (
    <div>
      <datalist id="dl-relations">
        {RELATIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <datalist id="dl-etats">
        {ETATS_CIVILS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      {error && <div className="mb-2 rounded-lg border border-[#b3543a] px-3 py-2 text-xs text-[#e0836b]">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[1500px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-card-alt text-[10px] uppercase tracking-wide text-muted">
              {["Nom", "Numéro de téléphone", "Recommandé par", "Relation avec reco", "État civil", "Travail", "Région", "Remarque", "DV / DR / AR", "Commentaires après contact", "Date", "Étape", ""].map((h, i) => (
                <th key={i} className="border-b border-line px-2 py-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <TableRow key={p.id} p={p} canEdit={canEdit} onChange={onChange} onError={setError} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
