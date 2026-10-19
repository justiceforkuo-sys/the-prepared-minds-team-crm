import { Resend } from "resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-prepared-minds-team-crm.vercel.app";

function from(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Prepared Minds Team <onboarding@resend.dev>";
}

/** Confirmation envoyée au candidat (avec le lien pour réserver son entretien s'il existe). */
export async function sendCandidateConfirmation(opts: { to: string; name: string; recruiterName: string; interviewUrl: string | null }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const first = opts.name.trim().split(/\s+/)[0];
  const text = [
    `Bonjour ${first},`,
    "",
    `Merci pour ta candidature chez Prepared Minds Team. Elle a bien été transmise à ${opts.recruiterName}.`,
    "",
    opts.interviewUrl
      ? `Pour aller vite, tu peux réserver ton entretien de 45 minutes ici : ${opts.interviewUrl}`
      : `${opts.recruiterName} te recontacte sous 24 à 48 heures pour fixer ton entretien.`,
    "",
    "À très vite,",
    "Prepared Minds Team",
  ].join("\n");
  return resend.emails.send({ from: from(), to: opts.to, subject: "Ta candidature chez Prepared Minds Team", text });
}

/** Notification au responsable : « Nouvelle candidature : {nom}, score {Fort/Moyen/À creuser} ». */
export async function sendRecruiterNotification(opts: {
  to: string;
  recruiterName: string;
  candidateName: string;
  scoreLabel: string;
  phone: string | null;
  email: string | null;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const first = opts.recruiterName.trim().split(/\s+/)[0];
  const text = [
    `Bonjour ${first},`,
    "",
    `Nouvelle candidature : ${opts.candidateName}, score ${opts.scoreLabel}.`,
    opts.phone ? `Téléphone : ${opts.phone}` : "",
    opts.email ? `Email : ${opts.email}` : "",
    "",
    "Règle d'or : un premier contact sous 24 à 48 heures.",
    `Ouvrir la candidature : ${SITE_URL}/recrutement`,
  ]
    .filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== ""))
    .join("\n");
  return resend.emails.send({
    from: from(),
    to: opts.to,
    subject: `Nouvelle candidature : ${opts.candidateName}, score ${opts.scoreLabel}`,
    text,
  });
}

/** Invitation d'un nouveau collaborateur (lien d'activation : il choisit son mot de passe). */
export async function sendCollaboratorInvitation(opts: { to: string; name: string; sponsorName: string; activationUrl: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const first = opts.name.trim().split(/\s+/)[0];
  const text = [
    `Bonjour ${first},`,
    "",
    `Bienvenue dans l'équipe ! ${opts.sponsorName} t'a ouvert un accès au CRM de Prepared Minds Team.`,
    "",
    `Clique ici pour créer ton mot de passe : ${opts.activationUrl}`,
    "Ce lien est personnel et à usage unique.",
    "",
    "Dès ta première connexion, ton parcours de démarrage (Fast Start) t'attend dans l'onglet Onboarding.",
    "",
    "Prepared Minds Team",
  ].join("\n");
  return resend.emails.send({ from: from(), to: opts.to, subject: "Bienvenue chez Prepared Minds Team : active ton accès", text });
}
