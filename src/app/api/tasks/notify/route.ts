import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendTaskAssignedEmail } from "@/lib/email/send-task-assigned";

export async function POST(request: Request) {
  const { taskId } = await request.json();
  if (!taskId) return NextResponse.json({ error: "taskId manquant" }, { status: 400 });

  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select(
      `title, notes, due_date,
       assignee:people!tasks_assigned_to_fkey(name, email),
       assigner:people!tasks_assigned_by_fkey(name)`
    )
    .eq("id", taskId)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: error?.message ?? "tâche introuvable" }, { status: 404 });
  }

  const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
  const assigner = Array.isArray(task.assigner) ? task.assigner[0] : task.assigner;

  if (!assignee?.email) {
    return NextResponse.json({ skipped: "assignee sans email" });
  }

  try {
    await sendTaskAssignedEmail({
      assigneeEmail: assignee.email,
      assigneeName: assignee.name,
      assignerName: assigner?.name ?? "Un collaborateur",
      title: task.title,
      notes: task.notes,
      dueDate: task.due_date,
    });
  } catch (err) {
    console.error("tasks/notify: send error", err);
    return NextResponse.json({ error: "envoi échoué" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
