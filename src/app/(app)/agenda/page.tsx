import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { AgendaBoard, type PaymentReminderRow } from "./agenda-board";

export default async function AgendaPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const [{ data: tasks }, { data: people }, { data: reminders }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assignee:people!tasks_assigned_to_fkey(name), assigner:people!tasks_assigned_by_fkey(name)")
      .or(`assigned_to.eq.${person.id},assigned_by.eq.${person.id}`)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("people").select("id, name").order("name"),
    supabase
      .from("payment_reminders")
      .select("*, client_policy:client_policies(product_label, client:clients(name))")
      .eq("status", "pending")
      .order("remind_on", { ascending: true }),
  ]);

  return (
    <AgendaBoard
      me={{ id: person.id, name: person.name }}
      initialTasks={tasks ?? []}
      people={people ?? []}
      initialReminders={(reminders as PaymentReminderRow[]) ?? []}
    />
  );
}
