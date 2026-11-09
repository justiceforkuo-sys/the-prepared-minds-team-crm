import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentPerson } from "@/lib/current-person";
import { Entrainement } from "./entrainement";

// Le prospect fictif répond via Claude : on laisse jusqu'à 60 s à chaque réplique ou retour.
export const maxDuration = 60;

export default async function EntrainementPage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  return (
    <div>
      <Link href="/scripts" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={16} /> Scripts
      </Link>
      <h2 className="font-serif text-xl font-semibold text-ink">S&apos;entraîner aux appels</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Claude joue un prospect fictif. Tu fixes un rendez-vous comme au téléphone (au clavier ou à la voix), puis tu reçois un retour étape par étape, une note sur 10 et un point à améliorer.
      </p>
      <Entrainement />
    </div>
  );
}
