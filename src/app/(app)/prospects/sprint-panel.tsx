"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Flame } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtDate } from "@/lib/format";
import type { LinkedinSprint, LinkedinWeeklyLog, Prospect } from "@/types/database";

function mondayOf(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

const emptySprintForm = {
  date_debut: new Date().toISOString().slice(0, 10),
  date_fin: addWeeks(new Date().toISOString().slice(0, 10), 6),
  cible_contacts_recrutement: "150",
  cible_echanges_recrutement: "30",
  cible_entretiens_recrutement: "9",
  cible_jfa_recrutement: "4",
  cible_contacts_client: "150",
  cible_echanges_client: "40",
  cible_rdv_client: "15",
  cible_dossiers_client: "7",
  cible_contacts_prescripteur: "50",
  cible_echanges_prescripteur: "15",
  cible_mises_en_relation_prescripteur: "5",
  cible_leads_prescripteur: "3",
};

function Bar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[11px]">
        <span className="text-white/80">{label}</span>
        <span className="font-bold text-white">
          {current} / {target}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #172047, #f5cd54)" }}
        />
      </div>
    </div>
  );
}

export function SprintPanel({ ownerId, prospects }: { ownerId: string; prospects: Prospect[] }) {
  const supabase = createClient();
  const [sprint, setSprint] = useState<LinkedinSprint | null>(null);
  const [weeklyLog, setWeeklyLog] = useState<LinkedinWeeklyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [sprintForm, setSprintForm] = useState(emptySprintForm);
  const [showWeekly, setShowWeekly] = useState(false);
  const [weeklyForm, setWeeklyForm] = useState({
    connexions_envoyees: "",
    connexions_acceptees: "",
    posts_publies: "",
    commentaires_postes: "",
  });

  const today = new Date().toISOString().slice(0, 10);
  const currentWeekStart = mondayOf(new Date());

  useEffect(() => {
    Promise.all([
      supabase.from("linkedin_sprints").select("*").order("date_debut", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("linkedin_weekly_log").select("*").eq("semaine_debut", currentWeekStart).maybeSingle(),
    ]).then(([{ data: s }, { data: w }]) => {
      setSprint((s as LinkedinSprint) ?? null);
      setWeeklyLog((w as LinkedinWeeklyLog) ?? null);
      if (w) {
        const log = w as LinkedinWeeklyLog;
        setWeeklyForm({
          connexions_envoyees: String(log.connexions_envoyees),
          connexions_acceptees: String(log.connexions_acceptees),
          posts_publies: String(log.posts_publies),
          commentaires_postes: String(log.commentaires_postes),
        });
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    if (!sprint) return null;
    const inWindow = (p: Prospect) => p.created_at.slice(0, 10) >= sprint.date_debut && p.created_at.slice(0, 10) <= sprint.date_fin;
    const forCategory = (cat: "client" | "recrutement" | "prescripteur") =>
      prospects.filter((p) => p.category === cat && inWindow(p));

    const build = (cat: "client" | "recrutement") => {
      const list = forCategory(cat);
      const echanges = list.filter((p) => ["Répondu", "RDV pris", "Entretien / Dossier"].includes(p.stage)).length;
      const rdv = list.filter((p) => ["RDV pris", "Entretien / Dossier"].includes(p.stage)).length;
      const dossiers = list.filter((p) => p.stage === "Entretien / Dossier").length;
      return { contacts: list.length, echanges, rdv, dossiers };
    };

    const buildPrescripteur = () => {
      const list = forCategory("prescripteur");
      const echanges = list.filter((p) =>
        ["Répondu", "Échange qualifié", "Mise en relation obtenue", "Nouveau lead client généré"].includes(p.stage)
      ).length;
      const misesEnRelation = list.filter((p) =>
        ["Mise en relation obtenue", "Nouveau lead client généré"].includes(p.stage)
      ).length;
      const leads = list.filter((p) => p.stage === "Nouveau lead client généré").length;
      return { contacts: list.length, echanges, misesEnRelation, leads };
    };

    return { recrutement: build("recrutement"), client: build("client"), prescripteur: buildPrescripteur() };
  }, [sprint, prospects]);

  const daysRemaining = sprint
    ? Math.ceil((new Date(sprint.date_fin).getTime() - new Date(today).getTime()) / 86400000)
    : null;
  const sprintExpired = sprint ? sprint.date_fin < today : false;

  const createSprint = async () => {
    const payload = {
      person_id: ownerId,
      date_debut: sprintForm.date_debut,
      date_fin: sprintForm.date_fin,
      cible_contacts_recrutement: parseInt(sprintForm.cible_contacts_recrutement, 10) || 0,
      cible_echanges_recrutement: parseInt(sprintForm.cible_echanges_recrutement, 10) || 0,
      cible_entretiens_recrutement: parseInt(sprintForm.cible_entretiens_recrutement, 10) || 0,
      cible_jfa_recrutement: parseInt(sprintForm.cible_jfa_recrutement, 10) || 0,
      cible_contacts_client: parseInt(sprintForm.cible_contacts_client, 10) || 0,
      cible_echanges_client: parseInt(sprintForm.cible_echanges_client, 10) || 0,
      cible_rdv_client: parseInt(sprintForm.cible_rdv_client, 10) || 0,
      cible_dossiers_client: parseInt(sprintForm.cible_dossiers_client, 10) || 0,
      cible_contacts_prescripteur: parseInt(sprintForm.cible_contacts_prescripteur, 10) || 0,
      cible_echanges_prescripteur: parseInt(sprintForm.cible_echanges_prescripteur, 10) || 0,
      cible_mises_en_relation_prescripteur: parseInt(sprintForm.cible_mises_en_relation_prescripteur, 10) || 0,
      cible_leads_prescripteur: parseInt(sprintForm.cible_leads_prescripteur, 10) || 0,
    };
    const { data } = await supabase.from("linkedin_sprints").insert(payload).select().single();
    if (data) setSprint(data as LinkedinSprint);
    setShowNewForm(false);
  };

  const saveWeekly = async () => {
    const payload = {
      person_id: ownerId,
      semaine_debut: currentWeekStart,
      connexions_envoyees: parseInt(weeklyForm.connexions_envoyees, 10) || 0,
      connexions_acceptees: parseInt(weeklyForm.connexions_acceptees, 10) || 0,
      posts_publies: parseInt(weeklyForm.posts_publies, 10) || 0,
      commentaires_postes: parseInt(weeklyForm.commentaires_postes, 10) || 0,
    };
    const { data } = await supabase
      .from("linkedin_weekly_log")
      .upsert(payload, { onConflict: "person_id,semaine_debut" })
      .select()
      .single();
    if (data) setWeeklyLog(data as LinkedinWeeklyLog);
    setShowWeekly(false);
  };

  const tauxAcceptation = weeklyLog && weeklyLog.connexions_envoyees > 0
    ? Math.round((weeklyLog.connexions_acceptees / weeklyLog.connexions_envoyees) * 100)
    : null;

  if (loading) return null;

  return (
    <div
      className="mb-4 overflow-hidden rounded-2xl border"
      style={{ borderColor: "#172047", background: "linear-gradient(135deg, #172047 0%, #1f3468 100%)" }}
    >
      <div className="p-3.5">
        {!sprint || sprintExpired ? (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <Flame size={16} style={{ color: "#f5cd54" }} />
              {sprintExpired ? "Sprint terminé — lance le suivant" : "Aucun sprint actif"}
            </div>
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-night"
                style={{ background: "#f5cd54" }}
              >
                Nouveau sprint
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg bg-white/10 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] text-white/70">Début</label>
                    <input
                      type="date"
                      value={sprintForm.date_debut}
                      onChange={(e) => setSprintForm((f) => ({ ...f, date_debut: e.target.value }))}
                      className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-white/70">Fin</label>
                    <input
                      type="date"
                      value={sprintForm.date_fin}
                      onChange={(e) => setSprintForm((f) => ({ ...f, date_fin: e.target.value }))}
                      className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/70">Recrutement</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ["cible_contacts_recrutement", "Contacts"],
                      ["cible_echanges_recrutement", "Échanges"],
                      ["cible_entretiens_recrutement", "Entretiens"],
                      ["cible_jfa_recrutement", "JFA"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-0.5 block text-[9px] text-white/60">{label}</label>
                      <input
                        type="number"
                        value={sprintForm[key]}
                        onChange={(e) => setSprintForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full rounded-md border border-white/20 bg-white/10 px-1.5 py-1 text-xs text-white outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/70">Client</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ["cible_contacts_client", "Contacts"],
                      ["cible_echanges_client", "Échanges"],
                      ["cible_rdv_client", "RDV"],
                      ["cible_dossiers_client", "Dossiers"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-0.5 block text-[9px] text-white/60">{label}</label>
                      <input
                        type="number"
                        value={sprintForm[key]}
                        onChange={(e) => setSprintForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full rounded-md border border-white/20 bg-white/10 px-1.5 py-1 text-xs text-white outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/70">Prescripteur</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ["cible_contacts_prescripteur", "Contacts"],
                      ["cible_echanges_prescripteur", "Échanges"],
                      ["cible_mises_en_relation_prescripteur", "Mises en relation"],
                      ["cible_leads_prescripteur", "Leads"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-0.5 block text-[9px] text-white/60">{label}</label>
                      <input
                        type="number"
                        value={sprintForm[key]}
                        onChange={(e) => setSprintForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full rounded-md border border-white/20 bg-white/10 px-1.5 py-1 text-xs text-white outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createSprint}
                    className="flex-1 rounded-md py-1.5 text-xs font-bold text-night"
                    style={{ background: "#f5cd54" }}
                  >
                    Lancer le sprint
                  </button>
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Flame size={16} style={{ color: "#f5cd54" }} />
                {sprint.titre}
              </div>
              <div className="text-[11px] text-white/70">
                {fmtDate(sprint.date_debut)} → {fmtDate(sprint.date_fin)} · {daysRemaining}j restants
              </div>
            </div>

            {counts && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-2 rounded-lg bg-white/10 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/70">Recrutement</div>
                  <Bar label="Contacts" current={counts.recrutement.contacts} target={sprint.cible_contacts_recrutement} />
                  <Bar label="Échanges qualifiés" current={counts.recrutement.echanges} target={sprint.cible_echanges_recrutement} />
                  <Bar label="Entretiens" current={counts.recrutement.rdv} target={sprint.cible_entretiens_recrutement} />
                  <Bar label="JFA intégrés" current={counts.recrutement.dossiers} target={sprint.cible_jfa_recrutement} />
                </div>
                <div className="flex flex-col gap-2 rounded-lg bg-white/10 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/70">Client</div>
                  <Bar label="Contacts" current={counts.client.contacts} target={sprint.cible_contacts_client} />
                  <Bar label="Échanges qualifiés" current={counts.client.echanges} target={sprint.cible_echanges_client} />
                  <Bar label="RDV pris" current={counts.client.rdv} target={sprint.cible_rdv_client} />
                  <Bar label="Dossiers ouverts" current={counts.client.dossiers} target={sprint.cible_dossiers_client} />
                </div>
                <div className="flex flex-col gap-2 rounded-lg bg-white/10 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/70">Prescripteur</div>
                  <Bar label="Contacts" current={counts.prescripteur.contacts} target={sprint.cible_contacts_prescripteur} />
                  <Bar label="Échanges qualifiés" current={counts.prescripteur.echanges} target={sprint.cible_echanges_prescripteur} />
                  <Bar
                    label="Mises en relation"
                    current={counts.prescripteur.misesEnRelation}
                    target={sprint.cible_mises_en_relation_prescripteur}
                  />
                  <Bar label="Leads générés" current={counts.prescripteur.leads} target={sprint.cible_leads_prescripteur} />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowWeekly((s) => !s)}
              className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/10 px-2.5 py-2 text-xs font-bold text-white"
            >
              <span>
                Bilan de la semaine{tauxAcceptation !== null ? ` — ${tauxAcceptation}% d'acceptation` : ""}
              </span>
              {showWeekly ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showWeekly && (
              <div className="mt-2 flex flex-col gap-2 rounded-lg bg-white/10 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["connexions_envoyees", "Connexions envoyées"],
                      ["connexions_acceptees", "Connexions acceptées"],
                      ["posts_publies", "Posts publiés"],
                      ["commentaires_postes", "Commentaires postés"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-0.5 block text-[10px] text-white/70">{label}</label>
                      <input
                        type="number"
                        value={weeklyForm[key]}
                        onChange={(e) => setWeeklyForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={saveWeekly}
                  className="rounded-md py-1.5 text-xs font-bold text-night"
                  style={{ background: "#f5cd54" }}
                >
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
