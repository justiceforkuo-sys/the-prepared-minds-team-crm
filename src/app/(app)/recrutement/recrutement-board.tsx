"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";
import type { RecruitmentApplication, RecruitmentStatus } from "@/types/database";

type CandidateRow = RecruitmentApplication & { recruiter: { name: string } | null };

const STATUSES: RecruitmentStatus[] = ["Nouveau", "Contacté", "Entretien", "Retenu", "Rejeté"];
const STATUS_COLOR: Record<RecruitmentStatus, string> = {
  Nouveau: "#5a6b85",
  Contacté: "#1e3a6d",
  Entretien: "#2f5fa8",
  Retenu: "#3f7d5c",
  Rejeté: "#b3543a",
};

function age(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const diff = Date.now() - new Date(birthdate).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function RecrutementBoard({
  isAdmin,
  initialCandidates,
}: {
  isAdmin: boolean;
  initialCandidates: CandidateRow[];
}) {
  const supabase = createClient();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [statusFilter, setStatusFilter] = useState<RecruitmentStatus | "Tous">("Tous");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [converted, setConverted] = useState<string[]>([]);

  const filtered = useMemo(
    () => (statusFilter === "Tous" ? candidates : candidates.filter((c) => c.status === statusFilter)),
    [candidates, statusFilter]
  );

  const setStatus = async (id: string, status: RecruitmentStatus) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    await supabase.from("recruitment_applications").update({ status }).eq("id", id);
  };

  const convertToCollaborator = async (c: CandidateRow) => {
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;
    const { data: person } = await supabase.from("people").select("id").eq("auth_user_id", me.user.id).single();
    if (!person) return;
    await supabase.from("people").insert({
      name: c.name,
      email: c.email,
      phone: c.phone,
      rank: "JFAI",
      reports_to: person.id,
    });
    setConverted((prev) => [...prev, c.id]);
  };

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Recrutement</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Candidatures reçues via les formulaires de pré-qualification de la campagne d&apos;affiches.
      </p>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-2">
        {(["Tous", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              statusFilter === s ? "border-gold bg-line text-gold-light" : "border-line bg-card text-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucune candidature {statusFilter !== "Tous" ? `au statut "${statusFilter}"` : "pour l'instant"}.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((c) => {
          const isOpen = expanded === c.id;
          const candidateAge = age(c.birthdate);
          return (
            <div
              key={c.id}
              className="rounded-2xl border border-line bg-card p-3.5"
              style={{ borderLeft: `3px solid ${STATUS_COLOR[c.status]}` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : c.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <div className="text-sm font-bold text-ink">{c.name}</div>
                  <div className="text-xs text-muted">
                    {c.status}
                    {isAdmin && c.recruiter && ` · recruté par ${c.recruiter.name}`}
                    {" · "}
                    {fmtDate(c.created_at)}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
              </button>

              {isOpen && (
                <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-xs">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-ink">
                    {c.phone && <div>📞 {c.phone}</div>}
                    {c.email && <div>✉️ {c.email}</div>}
                    {c.nationality && <div>Nationalité : {c.nationality}</div>}
                    {candidateAge !== null && (
                      <div className={candidateAge < 21 ? "font-bold text-red" : ""}>
                        Âge : {candidateAge} ans{candidateAge < 21 ? " (< 21 ans)" : ""}
                      </div>
                    )}
                    {c.current_situation && <div>Situation : {c.current_situation}</div>}
                    <div className={c.has_cess === false ? "font-bold text-red" : ""}>
                      CESS : {c.has_cess === null ? "—" : c.has_cess ? "Oui" : "Non"}
                    </div>
                    <div className={!c.availability_confirmed ? "font-bold text-red" : ""}>
                      Disponibilité confirmée : {c.availability_confirmed ? "Oui" : "Non"}
                    </div>
                    {c.french_level && <div>Français : {c.french_level}</div>}
                    {c.english_level && <div>Anglais : {c.english_level}</div>}
                    {c.referral_source && <div className="col-span-2">Source : {c.referral_source}</div>}
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <select
                      value={c.status}
                      onChange={(e) => setStatus(c.id, e.target.value as RecruitmentStatus)}
                      className="rounded-md border border-line bg-card-alt px-2 py-1 text-xs font-bold outline-none focus:border-gold"
                      style={{ color: STATUS_COLOR[c.status] }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    {c.status === "Retenu" && (
                      <button
                        onClick={() => convertToCollaborator(c)}
                        disabled={converted.includes(c.id)}
                        className="flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night disabled:opacity-50"
                      >
                        <UserCheck size={13} />
                        {converted.includes(c.id) ? "Ajouté à l'équipe" : "Ajouter à l'équipe"}
                      </button>
                    )}
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
