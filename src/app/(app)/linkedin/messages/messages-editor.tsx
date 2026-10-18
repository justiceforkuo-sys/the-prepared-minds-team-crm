"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Feather } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { GROUP_LABEL, STEP_LABEL } from "@/lib/linkedin/status";
import { renderMessage, templateFor } from "@/lib/linkedin/messages";
import {
  FSMA_REMINDER,
  PREVIEW_CONTACT,
  VARIABLES,
  fsmaFlags,
  isStrongVersion,
  rate,
} from "@/lib/linkedin/templates";
import type { LinkedinGroup, LinkedinTemplate, MessageStep, TemplateGroup, TemplateStat } from "@/lib/linkedin/types";

type TabKey = "A" | "B" | "C" | "D" | "reply";
const TABS: { key: TabKey; label: string }[] = [
  { key: "A", label: "A · Structures" },
  { key: "B", label: "B · Soignants" },
  { key: "C", label: "C · Prescripteurs" },
  { key: "D", label: "D · Recrues" },
  { key: "reply", label: "Réponse" },
];

const G4S_EXAMPLE =
  "Exemple : « J'ai été Operations Manager chez G4S au Palais de Justice de Liège avant de me lancer dans le conseil financier… »";

function statLine(s: TemplateStat | undefined): string {
  if (!s || s.sent === 0) return "Pas encore envoyé";
  const r = rate(s);
  return `Envoyé ${s.sent} fois · ${s.replies} réponse${s.replies > 1 ? "s" : ""} · ${r} %`;
}

interface CellProps {
  grp: TemplateGroup;
  step: MessageStep;
  variant: string;
  title: string;
  hint?: string;
  team: LinkedinTemplate | undefined;
  mine: LinkedinTemplate | undefined;
  teamStat: TemplateStat | undefined;
  mineStat: TemplateStat | undefined;
  meName: string;
  calendlyUrl: string | null;
  isAdmin: boolean;
  onSave: (grp: TemplateGroup, step: MessageStep, variant: string, body: string) => Promise<void>;
  onRevert: (grp: TemplateGroup, step: MessageStep, variant: string) => Promise<void>;
  onSaveTeam: (team: LinkedinTemplate, body: string) => Promise<void>;
}

function Cell(p: CellProps) {
  const teamBody = p.team?.body ?? (p.grp !== "ALL" ? templateFor(p.grp as LinkedinGroup, p.step) : templateFor("B", "reply")) ?? "";
  const hasTeamModel = p.variant === "default";
  const [draft, setDraft] = useState(p.mine?.body ?? "");
  const [teamDraft, setTeamDraft] = useState(p.team?.body ?? "");
  const [editTeam, setEditTeam] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const dirty = draft !== (p.mine?.body ?? "");
  const flags = fsmaFlags(draft);
  const previewSource = draft.trim() || (hasTeamModel ? teamBody : "");

  const insert = (token: string) => {
    const el = ref.current;
    if (!el) {
      setDraft((d) => d + token);
      return;
    }
    const s = el.selectionStart;
    const e = el.selectionEnd;
    setDraft(draft.slice(0, s) + token + draft.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  };

  const preview = previewSource
    ? renderMessage(previewSource, {
        firstName: PREVIEW_CONTACT.firstName,
        company: PREVIEW_CONTACT.company,
        position: PREVIEW_CONTACT.position,
        grp: p.grp === "ALL" ? "B" : (p.grp as LinkedinGroup),
        collaboratorName: p.meName,
        calendlyUrl: p.calendlyUrl,
      })
    : null;

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-ink">{p.title}</div>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
          {p.mine ? `Ma version — ${statLine(p.mineStat)}` : hasTeamModel ? `Modèle d'équipe — ${statLine(p.teamStat)}` : "Aucune version"}
        </span>
      </div>
      {p.hint && <p className="mb-2 text-[11px] text-muted">{p.hint}</p>}

      {hasTeamModel && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Modèle d&apos;équipe</span>
            {p.isAdmin && p.team && (
              <button onClick={() => setEditTeam((e) => !e)} className="text-[11px] text-gold-light">
                {editTeam ? "Annuler" : "Modifier le modèle d'équipe"}
              </button>
            )}
          </div>
          {editTeam && p.team ? (
            <div>
              <textarea
                value={teamDraft}
                onChange={(e) => setTeamDraft(e.target.value)}
                rows={9}
                className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              />
              <button
                onClick={async () => {
                  setBusy(true);
                  await p.onSaveTeam(p.team!, teamDraft);
                  setBusy(false);
                  setEditTeam(false);
                }}
                disabled={busy || !teamDraft.trim() || teamDraft === p.team.body}
                className="mt-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50"
              >
                Enregistrer le modèle d&apos;équipe
              </button>
            </div>
          ) : (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-card-alt px-3 py-2 font-sans text-xs leading-relaxed text-muted">
              {teamBody}
            </pre>
          )}
          {!draft && !p.mine && (
            <button onClick={() => setDraft(teamBody)} className="mt-1.5 text-[11px] text-gold-light">
              Partir du modèle d&apos;équipe pour écrire ma version
            </button>
          )}
        </div>
      )}

      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">Ma version</div>
      <div className="mb-1.5 flex flex-wrap gap-1">
        {VARIABLES.map((v) => (
          <button
            key={v.token}
            onClick={() => insert(v.token)}
            title={v.label}
            className="rounded-md border border-line bg-card-alt px-1.5 py-0.5 text-[10px] font-bold text-gold-light"
          >
            {v.token}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={8}
        placeholder={
          hasTeamModel ? "Vide = on utilise le modèle d'équipe. Écris ici ta propre version…" : "Écris ta variante ici… " + G4S_EXAMPLE
        }
        className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-gold"
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
        <span>{draft.length} caractères</span>
        {draft.length > 600 && <span>Message long : les messages courts obtiennent plus de réponses.</span>}
      </div>
      {flags.length > 0 && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-[#e08a3a] bg-card-alt px-2.5 py-1.5 text-[11px] text-ink">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-[#e08a3a]" />
          <span>
            À vérifier : formulation sensible pour la FSMA ({flags.join(", ")}).
          </span>
        </div>
      )}

      {preview && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">
            Aperçu avec {PREVIEW_CONTACT.firstName} Lambert ({PREVIEW_CONTACT.position})
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-line bg-card-alt px-3 py-2 font-sans text-xs leading-relaxed text-ink">
            {preview}
          </pre>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={async () => {
            setBusy(true);
            await p.onSave(p.grp, p.step, p.variant, draft);
            setBusy(false);
          }}
          disabled={busy || !dirty || !draft.trim()}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50"
        >
          Enregistrer ma version
        </button>
        {p.mine && (
          <button
            onClick={async () => {
              setBusy(true);
              await p.onRevert(p.grp, p.step, p.variant);
              setDraft("");
              setBusy(false);
            }}
            disabled={busy}
            className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink"
          >
            {hasTeamModel ? "Revenir au modèle d'équipe" : "Supprimer ma variante"}
          </button>
        )}
      </div>
    </div>
  );
}

export function MessagesEditor({
  meId,
  meName,
  isAdmin,
  calendlyUrl,
  initialTeam,
  initialMine,
  others,
  names,
  stats,
  badges,
}: {
  meId: string;
  meName: string;
  isAdmin: boolean;
  calendlyUrl: string | null;
  initialTeam: LinkedinTemplate[];
  initialMine: LinkedinTemplate[];
  others: LinkedinTemplate[];
  names: Record<string, string>;
  stats: Record<string, TemplateStat>;
  badges: { user_id: string; badge: string }[];
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<TabKey>("A");
  const [team, setTeam] = useState(initialTeam);
  const [mine, setMine] = useState(initialMine);
  const [badgeList, setBadgeList] = useState(badges);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<{ grp: TemplateGroup; step: MessageStep; variant: string; body: string } | null>(null);
  const [acked, setAcked] = useState(false);

  const findMine = (grp: TemplateGroup, step: MessageStep, variant: string) =>
    mine.find((t) => t.grp === grp && t.step === step && t.variant === variant);
  const findTeam = (grp: TemplateGroup, step: MessageStep) =>
    team.find((t) => t.grp === grp && t.step === step && t.variant === "default");

  const doSave = async (grp: TemplateGroup, step: MessageStep, variant: string, body: string) => {
    const existing = findMine(grp, step, variant);
    if (existing) {
      const { data, error } = await supabase
        .from("linkedin_templates")
        .update({ body })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return setNotice(`Enregistrement impossible : ${error.message}`);
      setMine((prev) => prev.map((t) => (t.id === existing.id ? (data as LinkedinTemplate) : t)));
    } else {
      const { data, error } = await supabase
        .from("linkedin_templates")
        .insert({ owner_id: meId, grp, step, variant, body })
        .select()
        .single();
      if (error) return setNotice(`Enregistrement impossible : ${error.message}`);
      setMine((prev) => [...prev, data as LinkedinTemplate]);
    }
    setNotice("Version enregistrée : elle sera utilisée dans ton pipeline.");
  };

  // Au premier enregistrement, on rappelle les règles FSMA.
  const onSave = async (grp: TemplateGroup, step: MessageStep, variant: string, body: string) => {
    if (mine.length === 0 && !acked) {
      setPending({ grp, step, variant, body });
      return;
    }
    await doSave(grp, step, variant, body);
  };

  const confirmPending = async () => {
    if (!pending) return;
    setAcked(true);
    const p = pending;
    setPending(null);
    await doSave(p.grp, p.step, p.variant, p.body);
  };

  const onRevert = async (grp: TemplateGroup, step: MessageStep, variant: string) => {
    const existing = findMine(grp, step, variant);
    if (!existing) return;
    const { error } = await supabase.from("linkedin_templates").delete().eq("id", existing.id);
    if (error) return setNotice(`Suppression impossible : ${error.message}`);
    setMine((prev) => prev.filter((t) => t.id !== existing.id));
    setNotice("Retour au modèle d'équipe.");
  };

  const onSaveTeam = async (t: LinkedinTemplate, body: string) => {
    const { data, error } = await supabase.from("linkedin_templates").update({ body }).eq("id", t.id).select().single();
    if (error) return setNotice(`Enregistrement impossible : ${error.message}`);
    setTeam((prev) => prev.map((x) => (x.id === t.id ? (data as LinkedinTemplate) : x)));
    setNotice("Modèle d'équipe mis à jour pour tout le monde.");
  };

  const adopt = async (v: LinkedinTemplate) => {
    const t = findTeam(v.grp, v.step);
    if (!t) return;
    const { data, error } = await supabase.from("linkedin_templates").update({ body: v.body }).eq("id", t.id).select().single();
    if (error) return setNotice(`Adoption impossible : ${error.message}`);
    setTeam((prev) => prev.map((x) => (x.id === t.id ? (data as LinkedinTemplate) : x)));
    if (v.owner_id) {
      await supabase.from("linkedin_badges").upsert({ user_id: v.owner_id, badge: "plume_or" }, { onConflict: "user_id,badge" });
      setBadgeList((prev) => (prev.some((b) => b.user_id === v.owner_id && b.badge === "plume_or") ? prev : [...prev, { user_id: v.owner_id!, badge: "plume_or" }]));
    }
    setNotice(`Version de ${names[v.owner_id ?? ""] ?? "?"} adoptée comme modèle d'équipe — badge « Plume d'or » attribué.`);
  };

  const cellFor = (grp: TemplateGroup, step: MessageStep, variant: string, title: string, hint?: string) => {
    const t = variant === "default" ? findTeam(grp, step) : undefined;
    const m = findMine(grp, step, variant);
    return (
      <Cell
        key={`${grp}-${step}-${variant}-${m?.id ?? "new"}`}
        grp={grp}
        step={step}
        variant={variant}
        title={title}
        hint={hint}
        team={t}
        mine={m}
        teamStat={t ? stats[t.id] : undefined}
        mineStat={m ? stats[m.id] : undefined}
        meName={meName}
        calendlyUrl={calendlyUrl}
        isAdmin={isAdmin}
        onSave={onSave}
        onRevert={onRevert}
        onSaveTeam={onSaveTeam}
      />
    );
  };

  const myBadges = badgeList.filter((b) => b.user_id === meId);
  const hasBadge = (userId: string | null) => badgeList.some((b) => b.user_id === userId && b.badge === "plume_or");

  return (
    <div>
      {myBadges.some((b) => b.badge === "plume_or") && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-line bg-card px-3.5 py-2.5 text-xs text-ink">
          <Feather size={16} className="text-gold-light" />
          <span>
            <strong>Plume d&apos;or</strong> — l&apos;une de tes versions a été adoptée comme modèle d&apos;équipe.
          </span>
        </div>
      )}

      {notice && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-muted">
            Fermer
          </button>
        </div>
      )}

      {pending && (
        <div className="mb-3 rounded-2xl border border-[#e08a3a] bg-card p-4">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink">
            <AlertTriangle size={15} className="text-[#e08a3a]" /> Avant d&apos;enregistrer ta première version
          </div>
          <p className="text-xs text-ink">{FSMA_REMINDER}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={confirmPending} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night">
              J&apos;ai compris, enregistrer
            </button>
            <button onClick={() => setPending(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted">
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              tab === t.key ? "border-gold bg-line text-gold-light" : "border-line text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {tab === "reply"
          ? cellFor("ALL", "reply", "default", "Réponse — pour tous les groupes", "Utilisée quand quelqu'un te répond (statuts « À toi de répondre » et « En conversation »).")
          : (["1", "2", "3"] as const).map((step) =>
              cellFor(tab, step, "default", `${tab} · ${GROUP_LABEL[tab as LinkedinGroup]} — ${STEP_LABEL[step]}`)
            )}
        {tab === "D" &&
          cellFor(
            "D",
            "1",
            "g4s",
            "D · Recrues — Message 1, variante « ex-collègue G4S »",
            "Utilisée seulement pour les contacts qui portent l'étiquette « ex-collègue G4S ». Propre à chaque collaborateur : il n'y a pas de modèle d'équipe."
          )}
      </div>

      {(() => {
        const list = others.filter((o) => o.owner_id);
        if (list.length === 0) return null;
        return (
          <div className="mt-6">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              Versions de mon équipe {isAdmin ? "" : "(lecture seule)"}
            </div>
            <div className="flex flex-col gap-2">
              {list.map((v) => {
                const t = findTeam(v.grp, v.step);
                const stat = stats[v.id];
                const strong = isAdmin && v.variant === "default" && isStrongVersion(stat, t ? stats[t.id] : undefined);
                const adopted = t?.body === v.body;
                const flags = fsmaFlags(v.body);
                return (
                  <details key={v.id} className="rounded-2xl border border-line bg-card p-3.5">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-ink">
                        {names[v.owner_id ?? ""] ?? "?"} — {v.grp === "ALL" ? "Réponse" : `${v.grp} · ${STEP_LABEL[v.step]}`}
                        {v.variant !== "default" ? " (variante G4S)" : ""}
                        {hasBadge(v.owner_id) && <Feather size={12} className="ml-1 inline text-gold-light" />}
                      </span>
                      <span className="text-muted">{statLine(stat)}</span>
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-card-alt px-3 py-2 font-sans text-xs leading-relaxed text-ink">
                      {v.body}
                    </pre>
                    {flags.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#e08a3a]">
                        <AlertTriangle size={12} /> À vérifier : formulation sensible pour la FSMA ({flags.join(", ")}).
                      </div>
                    )}
                    {strong && !adopted && (
                      <button onClick={() => adopt(v)} className="mt-2 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night">
                        Proposer comme modèle d&apos;équipe
                      </button>
                    )}
                    {adopted && <div className="mt-2 text-[11px] text-green">Adoptée comme modèle d&apos;équipe.</div>}
                  </details>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
