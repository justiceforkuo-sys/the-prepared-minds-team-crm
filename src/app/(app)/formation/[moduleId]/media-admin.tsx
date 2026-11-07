"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { enregistrerMedia, preparerEnvoiMedia, supprimerMedia } from "./actions";
import type { ModuleMedia } from "./formation-slideshow";

const BUCKET = "formation-media";

function mo(bytes: number | null) {
  return bytes ? `${(bytes / 1048576).toFixed(1).replace(".", ",")} Mo` : "";
}

/** Administrateur : dépose une vidéo MP4 ou un support PDF dans le module, ou en retire un. */
export function MediaAdmin({ moduleId, media }: { moduleId: string; media: ModuleMedia[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const send = async (file: File) => {
    const kind = file.type === "video/mp4" ? "video" : file.type === "application/pdf" ? "pdf" : null;
    if (!kind) {
      setMsg("Format accepté : vidéo MP4 ou PDF.");
      return;
    }
    setBusy(true);
    setMsg(`Envoi de « ${file.name} » (${mo(file.size)})…`);
    const prep = await preparerEnvoiMedia(moduleId, kind, file.name, file.type, file.size);
    if (!prep.ok) {
      setBusy(false);
      setMsg(prep.error);
      return;
    }
    const up = await createClient().storage.from(BUCKET).uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      setMsg(up.error.message);
      return;
    }
    const title = file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ");
    const res = await enregistrerMedia(moduleId, kind, prep.path, title, file.size);
    setBusy(false);
    setMsg(res.ok ? "Fichier ajouté." : res.error);
    if (res.ok) router.refresh();
  };

  const remove = async (m: ModuleMedia) => {
    if (!window.confirm(`Retirer « ${m.title} » de ce module ?`)) return;
    setBusy(true);
    const res = await supprimerMedia(m.id);
    setBusy(false);
    setMsg(res.ok ? "Fichier retiré." : res.error);
    if (res.ok) router.refresh();
  };

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-line bg-card p-3.5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Administrateur — fichiers du module</div>
      {media.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {media.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm text-ink">
              <span className="rounded bg-card-alt px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">{m.kind === "video" ? "Vidéo" : "PDF"}</span>
              <span className="min-w-0 flex-1 truncate">{m.title}</span>
              <span className="text-xs text-muted">{mo(m.sizeBytes)}</span>
              <button onClick={() => remove(m)} disabled={busy} aria-label={`Retirer ${m.title}`} className="rounded p-1 text-muted hover:text-red disabled:opacity-40">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        accept="video/mp4,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void send(f);
        }}
      />
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink disabled:opacity-40"
      >
        <Upload size={14} /> Ajouter une vidéo (MP4) ou un PDF
      </button>
      {msg && <div className="mt-2 text-xs text-muted">{msg}</div>}
      <div className="mt-1 text-[11px] text-muted">50 Mo maximum par fichier.</div>
    </div>
  );
}
