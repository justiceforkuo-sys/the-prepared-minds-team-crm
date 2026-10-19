"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

// Créneaux de formation proposés dans le formulaire de candidature (modifiables sans redéployer)
export function RecruitmentSettingsPanel({ initialSlots, adminId }: { initialSlots: string[]; adminId: string }) {
  const supabase = createClient();
  const [text, setText] = useState(initialSlots.join("\n"));
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const slots = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setBusy(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "recruitment_training_slots", value: slots, updated_at: new Date().toISOString(), updated_by: adminId }, { onConflict: "key" });
    setBusy(false);
    setNote(error ? `Enregistrement impossible : ${error.message}` : "Créneaux enregistrés : le formulaire de candidature les affiche tout de suite.");
  };

  return (
    <div>
      <h3 className="mb-1 font-serif text-base font-semibold text-ink">Formulaire de candidature : créneaux de formation</h3>
      <p className="mb-2 text-xs text-muted">Un créneau par ligne. Si la liste est vide, la case de confirmation disparaît du formulaire.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
        placeholder="Lundi 19h-21h"
      />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-night disabled:opacity-50">
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
    </div>
  );
}
