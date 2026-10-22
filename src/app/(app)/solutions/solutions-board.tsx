"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Library, Plus, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { DISCLAIMER, FAMILLES, REVIEW_LABEL, SOLUTION_MODULES, fold, familleLabel, matches, type Famille, type ReviewReason, type Solution } from "@/lib/solutions";

interface Item {
  solution: Solution;
  docCount: number;
  review: ReviewReason | null;
}

const MODULE_TITLE: Record<string, string> = {
  "1.1": "Module 1.1",
  "1.2": "Module 1.2",
  "3.1": "Module 3.1",
  "3.2": "Module 3.2",
  "4": "Module 4",
};

export function SolutionsBoard({ items, canEdit }: { items: Item[]; canEdit: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [famille, setFamille] = useState<Famille | "all">("all");
  const [compagnie, setCompagnie] = useState("all");
  const [vue, setVue] = useState<"liste" | "modules">("liste");
  const [msg, setMsg] = useState<string | null>(null);

  const compagnies = useMemo(() => [...new Set(items.flatMap((i) => i.solution.compagnies))].sort((a, b) => a.localeCompare(b)), [items]);
  const filtered = items.filter(
    (i) => (famille === "all" || i.solution.famille === famille) && (compagnie === "all" || i.solution.compagnies.some((c) => fold(c) === fold(compagnie))) && matches(i.solution, query)
  );
  const toReview = items.filter((i) => i.review);

  const create = async () => {
    const { data, error } = await supabase
      .from("solutions")
      .insert({ nom: "Nouvelle solution", famille: famille === "all" ? "protection" : famille, ordre: items.length + 1 })
      .select("id")
      .single();
    if (error || !data) setMsg(error?.message ?? "Création impossible.");
    else router.push(`/solutions/${(data as { id: string }).id}`);
  };

  const card = ({ solution: s, docCount, review }: Item) => (
    <Link key={s.id} href={`/solutions/${s.id}`} className="block rounded-2xl border border-line bg-card p-3.5 transition hover:border-gold">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-serif text-base font-semibold text-ink">{s.nom}</div>
          <div className="mt-0.5 text-[11px] text-muted">
            {familleLabel(s.famille)}
            {s.compagnies.length > 0 ? ` · ${s.compagnies.join(", ")}` : ""}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px]">
          {!s.publiee && <span className="rounded-full border border-line px-2 py-0.5 text-muted">Brouillon</span>}
          {s.verifiee_le && <span className="text-muted">Vérifiée le {new Date(s.verifiee_le).toLocaleDateString("fr-BE")}</span>}
          {docCount > 0 && <span className="text-muted">{docCount} document{docCount > 1 ? "s" : ""}</span>}
        </div>
      </div>
      {s.pour_qui && <p className="mt-1.5 line-clamp-2 text-xs text-muted">{s.pour_qui}</p>}
      {s.modules_fsma.length > 0 && <div className="mt-1.5 text-[11px] text-muted">À lire pour : modules {s.modules_fsma.join(" · ")}</div>}
      {review && <div className="mt-1.5 text-[11px] font-bold text-[#e08a3a]">À revérifier : {REVIEW_LABEL[review]}</div>}
    </Link>
  );

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink">
            <Library size={20} className="text-gold" /> Solutions
          </h2>
          <p className="mt-1 text-xs text-muted">Une fiche par solution, pour préparer tes modules FSMA et tes DV1 / DV2.</p>
        </div>
        {canEdit && (
          <button onClick={create} className="flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night">
            <Plus size={14} /> Nouvelle fiche
          </button>
        )}
      </div>
      <div className="mb-3 rounded-lg border border-line bg-card px-3 py-2 text-[11px] text-muted">{DISCLAIMER}</div>

      {canEdit && toReview.length > 0 && (
        <div className="mb-3 rounded-2xl border border-gold bg-card p-3 text-xs text-ink">
          <div className="mb-1 font-bold">{toReview.length} fiche{toReview.length > 1 ? "s" : ""} à revérifier</div>
          {toReview.map((i) => (
            <div key={i.solution.id}>
              <Link href={`/solutions/${i.solution.id}`} className="font-bold text-gold-light">
                {i.solution.nom}
              </Link>{" "}
              <span className="text-muted">— {REVIEW_LABEL[i.review!]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher : carence, déductible, exclusion…" className="w-full rounded-lg border border-line bg-card-alt py-2 pl-8 pr-3 text-xs text-ink outline-none focus:border-gold" />
        </div>
        <select value={compagnie} onChange={(e) => setCompagnie(e.target.value)} className="rounded-lg border border-line bg-card-alt px-2 py-2 text-xs text-ink">
          <option value="all">Toutes les compagnies</option>
          {compagnies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {[{ key: "all" as const, label: "Toutes" }, ...FAMILLES].map((f) => (
          <button key={f.key} onClick={() => setFamille(f.key)} className={`rounded-full border px-3 py-1 text-xs ${famille === f.key ? "border-gold bg-card-alt font-bold text-gold-light" : "border-line text-muted"}`}>
            {f.label}
          </button>
        ))}
        <span className="mx-1 w-px bg-line" />
        <button onClick={() => setVue("liste")} className={`rounded-full border px-3 py-1 text-xs ${vue === "liste" ? "border-gold bg-card-alt font-bold text-gold-light" : "border-line text-muted"}`}>
          Liste
        </button>
        <button onClick={() => setVue("modules")} className={`rounded-full border px-3 py-1 text-xs ${vue === "modules" ? "border-gold bg-card-alt font-bold text-gold-light" : "border-line text-muted"}`}>
          Mes modules
        </button>
      </div>

      {msg && <div className="mb-2 text-xs text-red">{msg}</div>}

      {vue === "liste" ? (
        filtered.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-5 text-center text-sm text-muted">
            {items.length === 0 ? "Aucune fiche publiée pour l'instant : elles arrivent bientôt." : "Aucune solution ne correspond à ta recherche."}
          </div>
        ) : (
          <div className="flex flex-col gap-3">{filtered.map(card)}</div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {SOLUTION_MODULES.map((m) => {
            const list = filtered.filter((i) => i.solution.modules_fsma.includes(m));
            return (
              <div key={m}>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                  {MODULE_TITLE[m]} · {list.length} fiche{list.length > 1 ? "s" : ""} à lire
                </div>
                {list.length === 0 ? <div className="text-xs text-muted">Aucune fiche reliée à ce module pour l&apos;instant.</div> : <div className="flex flex-col gap-3">{list.map(card)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
