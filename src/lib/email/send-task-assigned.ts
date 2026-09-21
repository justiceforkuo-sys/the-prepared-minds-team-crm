import { Resend } from "resend";
import { googleCalendarUrl } from "@/lib/calendar";

export interface TaskAssignedEmailInput {
  assigneeEmail: string;
  assigneeName: string;
  assignerName: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
}

export async function sendTaskAssignedEmail(input: TaskAssignedEmailInput) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "Prepared Minds Team <onboarding@resend.dev>";
  const calendarLink = input.dueDate ? googleCalendarUrl(input.title, input.notes ?? "", input.dueDate) : null;

  const text = [
    `Bonjour ${input.assigneeName},`,
    "",
    `${input.assignerName} t'a donné une tâche dans le CRM :`,
    "",
    `« ${input.title} »`,
    input.dueDate ? `Échéance : ${input.dueDate}` : "",
    input.notes ? `\n${input.notes}` : "",
    calendarLink ? `\nAjouter à Google Agenda : ${calendarLink}` : "",
    "",
    "Prepared Minds Team",
  ]
    .filter((l) => l !== "")
    .join("\n");

  return resend.emails.send({
    from,
    to: input.assigneeEmail,
    subject: `Nouvelle tâche — ${input.title}`,
    text,
  });
}
