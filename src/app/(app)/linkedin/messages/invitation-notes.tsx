"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { INVITATION_NOTES, INVITATION_NOTE_LIMIT, displayName } from "@/lib/linkedin/messages";
import { fsmaFlags } from "@/lib/linkedin/templates";

const GROUPES: { code: "A" | "B" | "C" | "D"; label: string }[] = [
  { code: "A", label: "Structures partenaires" },
  { code: "B", label: "Soignants" },
  { code: "C", label: "Prescripteurs" },
  { code: "D", label: "Recrues" },
];

function prenomDe(nom: string): string {
  const first = displayName(nom).trim().split(/\s+/)[0] ?? "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Notes à joindre aux invitations LinkedIn (Premium : notes illimitées, 300 caractères). */
export function InvitationNotes({ meName }: { meName: string }) {
  const [prenom, setPrenom] = useState("");
  const [relation, setRelation] = useState("");
  const [copie, setCopie] = useState<string | null>(null);
  const moi = prenomDe(meName);

  const texte = (code: "A" | "B" | "C" | "D") =>
    INVITATION_NOTES[code]
      .replaceAll("{prenom}", prenom.trim() || "[prénom]")
      .replaceAll("[relation commune]", relation.trim() || "[relation commune]")
      .replaceAll("{prenom_collab}", moi);

  const copier = async (code: string, t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      setCopie(code);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      setCopie(null);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-line bg-card p-4">
      <div className="text-sm font-bold text-ink">Notes d&apos;invitation</div>
      <p className="mt-1 text-xs text-muted">
        À joindre à une invitation LinkedIn (limite de {INVITATION_NOTE_LIMIT} caractères avec Premium). Remplis le prénom et la relation commune, puis copie la note du bon groupe.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          placeholder="Prénom de la personne invitée"
          className="rounded-lg border border-line bg-card-alt px-3 py-2 text-xs text-ink"
        />
        <input
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          placeholder="Relation commune (ex. Mireille Cobraiville)"
          className="rounded-lg border border-line bg-card-alt px-3 py-2 text-xs text-ink"
        />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {GROUPES.map((g) => {
          const t = texte(g.code);
          const flags = fsmaFlags(t);
          const trop = t.length > INVITATION_NOTE_LIMIT;
          return (
            <div key={g.code} className="rounded-xl border border-line bg-card-alt p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">
                  {g.code} · {g.label}
                </span>
                <span className={`text-[11px] ${trop ? "font-bold text-[#e08a3a]" : "text-muted"}`}>
                  {t.length} / {INVITATION_NOTE_LIMIT}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink">{t}</p>
              {flags.length > 0 && <p className="mt-1 text-[11px] text-[#e08a3a]">À vérifier : formulation sensible pour la FSMA ({flags.join(", ")}).</p>}
              <button onClick={() => copier(g.code, t)} className="mt-2 flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11px] font-bold text-ink">
                {copie === g.code ? <Check size={12} /> : <Copy size={12} />} {copie === g.code ? "Copié" : "Copier"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
