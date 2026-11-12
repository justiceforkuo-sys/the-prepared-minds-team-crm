"use client";

import { useState } from "react";
import { ProspectsBoard } from "./prospects-board";
import { RecommandationsTable } from "./recommandations-table";

/** Deux façons de travailler la page : la liste de prospects, ou le tableau des recommandations. */
export function ProspectsTabs({ ownerId, vue }: { ownerId: string; vue?: string }) {
  const [tab, setTab] = useState<"prospects" | "recos">(vue === "recommandations" ? "recos" : "prospects");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {([["prospects", "Prospects"], ["recos", "Recommandations"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg border px-3.5 py-2 text-xs font-bold ${
              tab === id ? "border-gold bg-line text-gold-light" : "border-line bg-card-alt text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "recos" ? <RecommandationsTable ownerId={ownerId} canEdit /> : <ProspectsBoard ownerId={ownerId} vue={vue} />}
    </div>
  );
}
