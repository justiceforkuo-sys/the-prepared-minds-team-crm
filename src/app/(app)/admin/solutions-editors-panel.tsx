"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

/** Responsables désignés pour rédiger et mettre à jour les fiches de la bibliothèque des solutions (en plus de l'admin). */
export function SolutionsEditorsPanel({ people }: { people: { id: string; name: string; editor: boolean }[] }) {
  const supabase = createClient();
  const [state, setState] = useState(people);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async (id: string, value: boolean) => {
    setState((s) => s.map((p) => (p.id === id ? { ...p, editor: value } : p)));
    const { error } = await supabase.from("people").update({ peut_editer_solutions: value }).eq("id", id);
    setMsg(error ? error.message : "Enregistré");
  };

  return (
    <div>
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">Bibliothèque des solutions : responsables des fiches</h3>
      <p className="mb-2 text-xs text-muted">Les personnes cochées peuvent rédiger, publier et déposer des documents. Les autres collaborateurs lisent seulement les fiches publiées.</p>
      <div className="flex flex-col gap-1 text-xs">
        {state.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-ink">
            <input type="checkbox" checked={p.editor} onChange={(e) => toggle(p.id, e.target.checked)} />
            {p.name}
          </label>
        ))}
      </div>
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}
