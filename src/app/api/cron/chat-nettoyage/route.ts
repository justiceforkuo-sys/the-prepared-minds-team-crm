import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

// Chaque nuit (voir vercel.json) : les messages de la discussion de plus de 90 jours sont effacés.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const svc = createServiceClient();
  const limite = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data, error } = await svc.from("chat_messages" as never).delete().lt("created_at", limite).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supprimes: (data as unknown[] | null)?.length ?? 0 });
}
