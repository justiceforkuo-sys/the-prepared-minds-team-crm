"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { parseSeuils, type Seuils } from "@/lib/calls";

const inputCls = "w-24 rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold";

/** Seuils de lecture de l'entonnoir des appels (page Appels) : « Augmente le volume » ou « Revois le script ». */
export function AppelsSeuilsPanel({ initial, meId }: { initial: Seuils; meId: string }) {
  const supabase = createClient();
  const [f, setF] = useState({
    volume: String(initial.volume_semaine),
    taux: String(Math.round(initial.taux_rdv_joints * 100)),
    min: String(initial.min_appels),
  });
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    const num = (v: string) => Number(v.replace(",", "."));
    const seuils = parseSeuils({ volume_semaine: num(f.volume), taux_rdv_joints: num(f.taux) / 100, min_appels: num(f.min) });
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "appels_seuils", value: seuils, updated_at: new Date().toISOString(), updated_by: meId }, { onConflict: "key" });
    setMsg(error ? error.message : "Seuils enregistrés.");
  };

  return (
    <div>
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">Seuils de lecture des appels</h3>
      <p className="mb-2 text-xs text-muted">
        Le volume d&apos;abord, la qualité ensuite : en dessous du volume, la page Appels dit « Augmente le volume » ; au-dessus du volume mais sous le taux de RDV, « Revois le script ». Valeurs de départ à ajuster d&apos;après ce que fait l&apos;équipe.
      </p>
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <label className="text-muted">
          Appels minimum par semaine
          <input value={f.volume} inputMode="numeric" onChange={(e) => setF({ ...f, volume: e.target.value })} className={`${inputCls} mt-0.5 block`} />
        </label>
        <label className="text-muted">
          % minimum de RDV parmi les appels joints
          <input value={f.taux} inputMode="numeric" onChange={(e) => setF({ ...f, taux: e.target.value })} className={`${inputCls} mt-0.5 block`} />
        </label>
        <label className="text-muted">
          Appels (4 semaines) avant de juger
          <input value={f.min} inputMode="numeric" onChange={(e) => setF({ ...f, min: e.target.value })} className={`${inputCls} mt-0.5 block`} />
        </label>
      </div>
      <button onClick={save} className="mt-2 rounded-md bg-gold px-2.5 py-1 text-xs font-bold text-night">
        Enregistrer les seuils
      </button>
      {msg && <div className="mt-1 text-[11px] text-ink">{msg}</div>}
    </div>
  );
}
