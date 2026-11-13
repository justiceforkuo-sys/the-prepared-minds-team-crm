import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { aujourdhuiBxl, genererTous } from "@/lib/rapport-hebdo-gen";

// Vendredi soir (voir vercel.json) : prépare le rapport de chaque collaborateur suivi.
// Niveaux 1 et 2 : publiés (et envoyés par email si RAPPORTS_EMAIL=on). Niveaux 3 et 4 : « à valider » dans la page « Mon rapport ».
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const svc = createServiceClient();
  const res = await genererTous(svc as never, aujourdhuiBxl(), false);
  return NextResponse.json(res);
}
