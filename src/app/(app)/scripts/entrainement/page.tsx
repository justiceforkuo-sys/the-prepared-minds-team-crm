import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPerson } from "@/lib/current-person";
import { createServiceClient } from "@/utils/supabase/service";
import { Entrainement } from "./entrainement";
import { SeancesListe, noteColor } from "./seances-liste";
import type { SeanceLigne } from "./actions";

// Le prospect fictif répond via Claude : on laisse jusqu'à 60 s à chaque réplique ou retour.
export const maxDuration = 60;

export default async function EntrainementPage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  const svc = createServiceClient() as unknown as SupabaseClient;

  const { data } = await svc
    .from("entrainement_seances")
    .select("id, person_id, scenario_titre, niveau, profil_label, note, rdv_obtenu, created_at")
    .eq("person_id", me.id)
    .order("created_at", { ascending: false })
    .limit(60);
  const seances = (data as SeanceLigne[] | null) ?? [];
  const moyenne = seances.length ? Math.round((seances.reduce((s, x) => s + x.note, 0) / seances.length) * 10) / 10 : null;
  const meilleure = seances.length ? Math.max(...seances.map((s) => s.note)) : null;

  const { count: nbEquipe } = await svc.from("people").select("id", { count: "exact", head: true }).eq("reports_to", me.id);
  const suit = me.is_admin || (nbEquipe ?? 0) > 0;

  return (
    <div>
      <Link href="/scripts" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={16} /> Scripts
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl font-semibold text-ink">S&apos;entraîner aux appels</h2>
        {suit && (
          <Link href="/scripts/entrainement/equipe" className="flex items-center gap-1.5 rounded-full border border-gold px-3 py-1.5 text-xs font-bold text-gold-light">
            <Users size={13} /> Suivi de l&apos;équipe
          </Link>
        )}
      </div>
      <p className="mb-4 mt-1 text-xs text-muted">
        Claude joue un prospect fictif. Tu fixes un rendez-vous comme au téléphone (au clavier ou à la voix), puis tu reçois un retour étape par étape, une note sur 10 et un point à améliorer.
      </p>
      <Entrainement />

      <div className="mt-8">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-ink">Mes séances</h3>
          {moyenne !== null && (
            <span className="text-xs text-muted">
              {seances.length} séance{seances.length > 1 ? "s" : ""} · moyenne <strong style={{ color: noteColor(moyenne) }}>{moyenne}/10</strong> · meilleure note <strong className="text-ink">{meilleure}/10</strong>
            </span>
          )}
        </div>
        <p className="mb-2 text-[11px] text-muted">Ton coach et ta hiérarchie peuvent relire ces séances (conversation et retour) pour t&apos;aider à progresser.</p>
        <SeancesListe lignes={seances} />
      </div>
    </div>
  );
}
