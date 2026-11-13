import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { aujourdhuiBxl, type RapportRow } from "@/lib/rapport-hebdo-gen";
import { envoyerRapportEmail } from "@/lib/email/send-rapport-hebdo";
import { addDays } from "@/lib/parcours";

// Samedi matin (voir vercel.json) : les rapports durs (niveaux 3 et 4) que personne n'a validés ni ignorés depuis vendredi soir
// sont publiés et envoyés automatiquement : chaque collaborateur reçoit son rapport du vendredi.
export const maxDuration = 120;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const svc = createServiceClient();
  const depuis = addDays(aujourdhuiBxl(), -2);
  const { data } = await svc.from("rapports_hebdo").select("*").eq("statut", "a_valider").gte("semaine", depuis);
  const rapports = (data as RapportRow[] | null) ?? [];
  let publies = 0;
  const emails: string[] = [];
  for (const r of rapports) {
    const { error } = await svc.from("rapports_hebdo").update({ statut: "envoye", envoye_at: new Date().toISOString() }).eq("id", r.id).eq("statut", "a_valider");
    if (error) continue;
    publies++;
    const m = await envoyerRapportEmail(svc as never, r).catch((e: unknown) => ({ sent: false, reason: e instanceof Error ? e.message : "erreur" }));
    emails.push(m.sent ? "envoyé" : (m.reason ?? "non envoyé"));
  }
  return NextResponse.json({ publies, emails });
}
