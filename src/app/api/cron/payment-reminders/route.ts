import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { sendPaymentReminderEmail } from "@/lib/email/send-payment-reminder";

// Déclenché une fois par jour par Vercel Cron (voir vercel.json). Vercel
// envoie automatiquement `Authorization: Bearer $CRON_SECRET` pour les cron
// jobs configurés — on vérifie ce même secret pour refuser tout autre appel.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: reminders, error } = await supabase
    .from("payment_reminders")
    .select(
      `id, note, created_by,
       client_policy:client_policies(id, product_label, worth, client:clients(name, email)),
       created_by_person:people!payment_reminders_created_by_fkey(name)`
    )
    .eq("status", "pending")
    .lte("remind_on", today);

  if (error) {
    console.error("payment-reminders cron: fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of reminders ?? []) {
    const policy = Array.isArray(r.client_policy) ? r.client_policy[0] : r.client_policy;
    const client = policy ? (Array.isArray(policy.client) ? policy.client[0] : policy.client) : null;
    const collaborateur = Array.isArray(r.created_by_person) ? r.created_by_person[0] : r.created_by_person;

    if (!client?.email) {
      skipped += 1;
      continue;
    }

    try {
      await sendPaymentReminderEmail({
        clientEmail: client.email,
        clientName: client.name,
        collaborateurName: collaborateur?.name ?? "Ton conseiller",
        productLabel: policy?.product_label ?? null,
        worth: policy?.worth ?? 0,
        note: r.note,
      });
      await supabase
        .from("payment_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", r.id);
      sent += 1;
    } catch (sendError) {
      console.error("payment-reminders cron: send error for reminder", r.id, sendError);
      failed += 1;
    }
  }

  return NextResponse.json({ sent, skipped, failed, total: reminders?.length ?? 0 });
}
