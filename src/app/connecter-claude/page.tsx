import { Lock } from "lucide-react";
import { isAllowedRedirect, readClient } from "@/lib/mcp/auth";
import { decider, isJustice } from "./actions";

type Search = { client_id?: string; redirect_uri?: string; state?: string; code_challenge?: string };

const shell = "flex min-h-screen items-center justify-center px-4";
const card = "w-full max-w-md rounded-2xl border border-line bg-card p-5";

export default async function ConnecterClaudePage({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const me = await isJustice();
  const client = readClient(q.client_id);
  const valid = !!client && isAllowedRedirect(q.redirect_uri) && client.redirectUris.includes(q.redirect_uri) && /^[A-Za-z0-9_-]{43,128}$/.test(q.code_challenge ?? "");

  if (!me || !valid) {
    return (
      <div className={shell}>
        <div className={card}>
          <h1 className="font-serif text-xl font-semibold text-ink">Connexion de Claude</h1>
          <p className="mt-2 text-sm text-muted">{!me ? "Cet accès est réservé à Justice." : "Cette demande d'autorisation n'est pas valide. Relance la connexion depuis Claude."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className={card}>
        <Lock size={20} className="mb-2 text-gold" />
        <div className="text-[10px] font-semibold tracking-[2px] text-muted">PREPARED MINDS TEAM</div>
        <h1 className="mt-1 font-serif text-xl font-semibold text-ink">Autoriser Claude à lire le CRM ?</h1>
        <p className="mt-2 text-sm text-ink">
          <strong>{client.name}</strong> demande un accès en <strong>lecture seule</strong> à ton CRM.
        </p>
        <ul className="mt-3 list-disc pl-5 text-xs text-muted">
          <li>Claude pourra consulter : l&apos;équipe, la production, les décomptes et le PVQ1, la rémunération des nouveaux, ton pipeline LinkedIn, tes prospects, la recherche d&apos;un client par son nom.</li>
          <li>Il ne pourra rien modifier, ni supprimer, ni envoyer.</li>
          <li>Les coordonnées des clients (téléphone, email, adresse) ne sont pas accessibles.</li>
          <li>Tu pourras retirer l&apos;accès à tout moment depuis les réglages des connecteurs de Claude.</li>
        </ul>
        <form action={decider} className="mt-4 flex gap-2">
          <input type="hidden" name="client_id" value={q.client_id} />
          <input type="hidden" name="redirect_uri" value={q.redirect_uri} />
          <input type="hidden" name="state" value={q.state ?? ""} />
          <input type="hidden" name="code_challenge" value={q.code_challenge} />
          <button name="decision" value="allow" className="flex-1 rounded-md bg-gold px-3 py-2 text-sm font-bold text-night">
            Autoriser
          </button>
          <button name="decision" value="deny" className="flex-1 rounded-md border border-line px-3 py-2 text-sm text-ink">
            Refuser
          </button>
        </form>
      </div>
    </div>
  );
}
