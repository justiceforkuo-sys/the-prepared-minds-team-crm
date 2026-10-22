"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  DOC_SOURCE_LABEL,
  DOC_TYPE_LABEL,
  FAMILLES,
  SOLUTION_MODULES,
  type DocSource,
  type DocType,
  type FaqItem,
  type Famille,
  type Solution,
  type SolutionDocument,
  type SolutionLink,
} from "@/lib/solutions";

const inputCls = "w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";
const goldBtn = "rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50";
const ghostBtn = "rounded-md border border-line px-3 py-1.5 text-xs text-ink disabled:opacity-50";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

/** Édition d'une fiche : réservée à l'admin et aux responsables désignés (la base refuse tout autre accès). */
export function SolutionEditor({ solution, docs, meId }: { solution: Solution; docs: SolutionDocument[]; meId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [f, setF] = useState<Solution>(solution);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(solution.nom === "Nouvelle solution");

  const set = <K extends keyof Solution>(k: K, v: Solution[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const text = (k: keyof Solution) => (
    <textarea value={(f[k] as string | null) ?? ""} onChange={(e) => set(k, (e.target.value || null) as never)} rows={4} className={inputCls} />
  );

  const save = async (extra: Partial<Solution> = {}) => {
    setBusy(true);
    const payload = {
      nom: f.nom.trim() || "Sans titre",
      famille: f.famille,
      compagnies: f.compagnies,
      pour_qui: f.pour_qui,
      probleme: f.probleme,
      fonctionnement: f.fonctionnement,
      fiscalite: f.fiscalite,
      fiscalite_annee: f.fiscalite_annee,
      conditions: f.conditions,
      exclusions: f.exclusions,
      quand_ne_pas_proposer: f.quand_ne_pas_proposer,
      faq: f.faq.filter((x) => x.q.trim() || x.r.trim()),
      modules_fsma: f.modules_fsma,
      liens: f.liens.filter((l) => l.label.trim() && l.url.trim()),
      unites_info: f.unites_info,
      publiee: f.publiee,
      ...extra,
    };
    const { error } = await supabase.from("solutions").update(payload).eq("id", solution.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Enregistré.");
      router.refresh();
    }
  };

  const verify = async () => {
    const extra = { verifiee_le: today(), verifiee_par: meId };
    setF((cur) => ({ ...cur, ...extra }));
    await save(extra);
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer définitivement la fiche « ${solution.nom} » et ses documents ?`)) return;
    const paths = docs.map((d) => d.fichier_path);
    if (paths.length > 0) await supabase.storage.from("solutions-docs").remove(paths);
    const { error } = await supabase.from("solutions").delete().eq("id", solution.id);
    if (error) setMsg(error.message);
    else router.push("/solutions");
  };

  const setFaq = (i: number, patch: Partial<FaqItem>) => set("faq", f.faq.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const setLink = (i: number, patch: Partial<SolutionLink>) => set("liens", f.liens.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  return (
    <div className="mt-6 rounded-2xl border border-gold bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="font-serif text-base font-semibold text-ink">Modifier cette fiche</span>
        <span className="text-xs text-muted">{open ? "Réduire" : "Ouvrir"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="rounded-md border border-line p-2 text-[11px] text-muted">
            Rédige à partir des documents officiels (conditions générales, brochures OVB). N&apos;écris rien que tu ne peux pas sourcer : dans le doute, laisse le champ vide.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom">
              <input value={f.nom} onChange={(e) => set("nom", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Famille">
              <select value={f.famille} onChange={(e) => set("famille", e.target.value as Famille)} className={inputCls}>
                {FAMILLES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Compagnie(s) concernée(s) — séparées par une virgule">
            <input value={f.compagnies.join(", ")} onChange={(e) => set("compagnies", e.target.value.split(",").map((c) => c.trim()).filter(Boolean))} className={inputCls} />
          </Field>
          <Field label="Pour qui">{text("pour_qui")}</Field>
          <Field label="Quel problème elle résout (langage simple, comme on l'explique au client)">{text("probleme")}</Field>
          <Field label="Comment ça marche">{text("fonctionnement")}</Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Field label="Avantages fiscaux">{text("fiscalite")}</Field>
            <Field label="Année de référence">
              <input value={f.fiscalite_annee ?? ""} inputMode="numeric" onChange={(e) => set("fiscalite_annee", e.target.value ? Number(e.target.value.replace(/\D/g, "").slice(0, 4)) : null)} className={inputCls} />
            </Field>
          </div>
          <Field label="Conditions, délais de carence, âges limites">{text("conditions")}</Field>
          <Field label="Exclusions">{text("exclusions")}</Field>
          <Field label="Quand NE PAS la proposer">{text("quand_ne_pas_proposer")}</Field>

          <div>
            <div className="mb-1 text-xs text-muted">Questions fréquentes</div>
            <div className="flex flex-col gap-2">
              {f.faq.map((x, i) => (
                <div key={i} className="rounded-md border border-line p-2">
                  <input value={x.q} placeholder="Question" onChange={(e) => setFaq(i, { q: e.target.value })} className={inputCls} />
                  <textarea value={x.r} placeholder="Réponse" rows={2} onChange={(e) => setFaq(i, { r: e.target.value })} className={`${inputCls} mt-1`} />
                  <button onClick={() => set("faq", f.faq.filter((_, k) => k !== i))} className="mt-1 text-[11px] text-muted underline">
                    Retirer
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => set("faq", [...f.faq, { q: "", r: "" }])} className={`${ghostBtn} mt-2`}>
              Ajouter une question
            </button>
          </div>

          <div>
            <div className="mb-1 text-xs text-muted">Modules de formation où la lire</div>
            <div className="flex flex-wrap gap-3 text-xs text-ink">
              {SOLUTION_MODULES.map((m) => (
                <label key={m} className="flex items-center gap-1">
                  <input type="checkbox" checked={f.modules_fsma.includes(m)} onChange={(e) => set("modules_fsma", e.target.checked ? [...f.modules_fsma, m] : f.modules_fsma.filter((x) => x !== m))} />
                  Module {m}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-muted">Liens : module de formation, quiz, script DV…</div>
            <div className="flex flex-col gap-1.5">
              {f.liens.map((l, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5">
                  <input value={l.label} placeholder="Libellé" onChange={(e) => setLink(i, { label: e.target.value })} className={`${inputCls} max-w-[11rem]`} />
                  <input value={l.url} placeholder="/formation-continue/… ou https://…" onChange={(e) => setLink(i, { url: e.target.value })} className={`${inputCls} min-w-[12rem] flex-1`} />
                  <button onClick={() => set("liens", f.liens.filter((_, k) => k !== i))} className="text-[11px] text-muted underline">
                    Retirer
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => set("liens", [...f.liens, { label: "", url: "" }])} className={`${ghostBtn} mt-2`}>
              Ajouter un lien
            </button>
          </div>
          <Field label="Unités générées (si connues)">
            <input value={f.unites_info ?? ""} onChange={(e) => set("unites_info", e.target.value || null)} className={inputCls} />
          </Field>

          <label className="flex items-center gap-2 text-xs text-ink">
            <input type="checkbox" checked={f.publiee} onChange={(e) => set("publiee", e.target.checked)} />
            Publiée : visible par tous les collaborateurs (sinon brouillon réservé aux responsables)
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button disabled={busy} onClick={() => save()} className={goldBtn}>
              Enregistrer
            </button>
            <button disabled={busy} onClick={verify} className={ghostBtn}>
              Enregistrer et marquer vérifiée aujourd&apos;hui
            </button>
            <button disabled={busy} onClick={remove} className="ml-auto text-xs text-muted underline">
              Supprimer la fiche
            </button>
          </div>
          {msg && <div className="text-xs text-ink">{msg}</div>}

          <DocsEditor solutionId={solution.id} docs={docs} meId={meId} />
        </div>
      )}
    </div>
  );
}

function DocsEditor({ solutionId, docs, meId }: { solutionId: string; docs: SolutionDocument[]; meId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocType>("conditions_generales");
  const [titre, setTitre] = useState("");
  const [version, setVersion] = useState("");
  const [dateVersion, setDateVersion] = useState("");
  const [source, setSource] = useState<DocSource>("compagnie");
  const [sourceNom, setSourceNom] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const upload = async () => {
    if (!file || !titre.trim() || !confirmed) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setMsg("Seuls les PDF sont acceptés.");
    if (file.size > 20 * 1024 * 1024) return setMsg("PDF trop lourd (20 Mo maximum).");
    setBusy(true);
    const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_");
    const path = `${solutionId}/${crypto.randomUUID().slice(0, 8)}-${safe}`;
    const { error: e1 } = await supabase.storage.from("solutions-docs").upload(path, file, { contentType: "application/pdf" });
    if (e1) {
      setBusy(false);
      return setMsg(e1.message);
    }
    const { error: e2 } = await supabase.from("solution_documents").insert({
      solution_id: solutionId,
      type,
      titre: titre.trim(),
      fichier_path: path,
      version: version.trim() || null,
      date_version: dateVersion || null,
      source,
      source_nom: sourceNom.trim() || null,
      depose_par: meId,
    });
    setBusy(false);
    if (e2) {
      await supabase.storage.from("solutions-docs").remove([path]);
      return setMsg(e2.message);
    }
    setMsg("Document déposé : la fiche est à revérifier.");
    setFile(null);
    setTitre("");
    setVersion("");
    setDateVersion("");
    setSourceNom("");
    setConfirmed(false);
    router.refresh();
  };

  const remove = async (d: SolutionDocument) => {
    if (!window.confirm(`Supprimer « ${d.titre} » ?`)) return;
    await supabase.storage.from("solutions-docs").remove([d.fichier_path]);
    const { error } = await supabase.from("solution_documents").delete().eq("id", d.id);
    if (error) setMsg(error.message);
    else router.refresh();
  };

  return (
    <div className="mt-2 rounded-xl border border-line p-3">
      <div className="mb-2 text-sm font-bold text-ink">Documents officiels (PDF)</div>
      {docs.map((d) => (
        <div key={d.id} className="mb-1 flex items-center justify-between gap-2 text-xs">
          <span className="text-ink">{d.titre}</span>
          <button onClick={() => remove(d)} className="text-muted underline">
            Supprimer
          </button>
        </div>
      ))}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Field label="Fichier PDF">
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-muted" />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as DocType)} className={inputCls}>
            {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((k) => (
              <option key={k} value={k}>
                {DOC_TYPE_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Titre affiché">
          <input value={titre} onChange={(e) => setTitre(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Version">
          <input value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Date de la version">
          <input type="date" value={dateVersion} min="2000-01-01" max="2100-12-31" onChange={(e) => setDateVersion(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Provenance">
          <div className="flex gap-1.5">
            <select value={source} onChange={(e) => setSource(e.target.value as DocSource)} className={inputCls}>
              {(Object.keys(DOC_SOURCE_LABEL) as DocSource[]).map((k) => (
                <option key={k} value={k}>
                  {DOC_SOURCE_LABEL[k]}
                </option>
              ))}
            </select>
            <input value={sourceNom} placeholder="Nom (ex. AXA)" onChange={(e) => setSourceNom(e.target.value)} className={inputCls} />
          </div>
        </Field>
      </div>
      <label className="mt-2 flex items-start gap-2 text-[11px] text-ink">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
        Ce PDF provient directement de la compagnie ou d&apos;OVB Willemot : ce n&apos;est pas une copie modifiée.
      </label>
      <button disabled={busy || !file || !titre.trim() || !confirmed} onClick={upload} className={`${goldBtn} mt-2`}>
        {busy ? "Dépôt…" : "Déposer le document"}
      </button>
      {msg && <div className="mt-1 text-xs text-ink">{msg}</div>}
    </div>
  );
}
