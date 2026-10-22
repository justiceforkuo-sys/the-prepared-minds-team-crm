import { fmtDate } from "@/lib/format";

export interface InboundAdminRow {
  id: string;
  received_at: string;
  owner_name: string | null;
  subject: string | null;
  result: string;
  detail: string | null;
  hasRaw: boolean;
}

const LABEL: Record<string, string> = { cree: "Créé", doublon: "Doublon", ignore: "Ignoré", confirmation: "Confirmation Gmail", erreur: "Erreur" };

/** Journal des emails LinkedIn reçus (voie 1 du bloc 7) : créé / doublon / ignoré, contenu brut supprimé après 30 jours. */
export function InboundLogPanel({ rows, endpoint }: { rows: InboundAdminRow[]; endpoint: string }) {
  const counts = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.result]: (m[r.result] ?? 0) + 1 }), {});
  return (
    <div>
      <h3 className="mb-1 font-serif text-lg font-semibold text-ink">LinkedIn : emails « invitation acceptée »</h3>
      <p className="mb-2 text-xs text-muted">
        Chaque collaborateur transfère les emails de LinkedIn vers son adresse personnelle ; le fournisseur d&apos;emails entrants envoie chaque email à l&apos;adresse ci-dessous
        (POST). Les emails ignorés ne sont pas conservés ; le contenu brut des autres est supprimé après 30 jours.
      </p>
      <div className="mb-2 break-all rounded-lg border border-line bg-card-alt px-2.5 py-2 text-[11px] text-ink">{endpoint}</div>
      <div className="mb-2 text-xs text-muted">
        {rows.length === 0
          ? "Aucun email reçu pour l'instant."
          : Object.entries(counts)
              .map(([k, n]) => `${n} ${LABEL[k] ?? k}`)
              .join(" · ")}
      </div>
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto text-xs">
        {rows.map((r) => (
          <div key={r.id} className="flex justify-between gap-2 border-b border-line pb-1">
            <span className="truncate text-muted">
              {fmtDate(r.received_at)} · <span className="text-ink">{r.owner_name ?? "destinataire inconnu"}</span> · {r.subject ?? "(sans objet)"}
              {r.detail ? ` — ${r.detail}` : ""}
            </span>
            <span className={r.result === "erreur" ? "text-red" : r.result === "cree" ? "font-bold text-[#1f8158]" : "text-muted"}>{LABEL[r.result] ?? r.result}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
