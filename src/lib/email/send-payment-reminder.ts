import { Resend } from "resend";
import { fmtEUR } from "@/lib/format";

export interface PaymentReminderEmailInput {
  clientEmail: string;
  clientName: string;
  collaborateurName: string;
  productLabel: string | null;
  worth: number;
  note: string | null;
}

export async function sendPaymentReminderEmail(input: PaymentReminderEmailInput) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "Prepared Minds Team <onboarding@resend.dev>";
  const produit = input.productLabel ?? "votre contrat";

  const text = [
    `Bonjour ${input.clientName},`,
    "",
    `Ceci est un rappel amical pour le premier versement de ${produit} (${fmtEUR(input.worth)}).`,
    input.note ? `\n${input.note}\n` : "",
    `N'hésite pas à me contacter si tu as la moindre question.`,
    "",
    input.collaborateurName,
    "Prepared Minds Team",
  ]
    .filter((l) => l !== "")
    .join("\n");

  return resend.emails.send({
    from,
    to: input.clientEmail,
    subject: `Rappel — premier versement ${produit}`,
    text,
  });
}
