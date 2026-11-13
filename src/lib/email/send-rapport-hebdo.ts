import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { construireMessage, habillerEmail, prenomDe, type Faits, type Ligne, type Niveau, type Redaction, type Tache } from "@/lib/rapport-hebdo-format";

export interface RapportPourEmail {
  person_id: string;
  niveau: Niveau;
  serie: number;
  taux: number | null;
  bilan: Ligne[];
  taches: Tache[];
  faits: Faits;
  redaction: Redaction;
  sujet: string;
}

/**
 * Envoie le rapport par email à la personne (coach en copie dès le niveau 2, over-coach dès le niveau 3).
 * Garde-fou : rien ne part tant que RAPPORTS_EMAIL n'est pas « on » ; le rapport reste lisible dans le CRM.
 */
export interface OptionsEmail {
  /** Envoi de test : le rapport part à cette adresse seulement (sans copie), même si l'envoi automatique est désactivé. */
  versEmail?: string;
}

export async function envoyerRapportEmail(svc: SupabaseClient, r: RapportPourEmail, opt: OptionsEmail = {}): Promise<{ sent: boolean; reason?: string }> {
  const test = !!opt.versEmail;
  if (!test && process.env.RAPPORTS_EMAIL !== "on") return { sent: false, reason: "envoi par email désactivé" };
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "clé d'envoi absente" };
  const { data: p } = await svc.from("people").select("name, email, reports_to").eq("id", r.person_id).maybeSingle();
  const me = p as { name: string; email: string | null; reports_to: string | null } | null;
  if (!me?.email) return { sent: false, reason: "pas d'adresse email" };

  const cc: string[] = [];
  if (!test && r.niveau >= 2 && me.reports_to) {
    const { data: c } = await svc.from("people").select("email, reports_to").eq("id", me.reports_to).maybeSingle();
    const coach = c as { email: string | null; reports_to: string | null } | null;
    if (coach?.email) cc.push(coach.email);
    if (r.niveau >= 3 && coach?.reports_to) {
      const { data: o } = await svc.from("people").select("email").eq("id", coach.reports_to).maybeSingle();
      const over = o as { email: string | null } | null;
      if (over?.email) cc.push(over.email);
    }
  }

  const msg = construireMessage({ prenom: prenomDe(me.name), niveau: r.niveau, baseline: !!r.faits.baseline, serie: r.serie, bilan: r.bilan, taux: r.taux, taches: r.taches, faits: r.faits, redaction: r.redaction });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "Prepared Minds Team <onboarding@resend.dev>";
  // Les réponses vont à l'administrateur (Justice) : le rapport est un échange, pas un message à sens unique.
  const { data: adm } = await svc.from("people").select("email").eq("is_admin", true).not("email", "is", null).order("created_at").limit(1);
  const replyTo = ((adm as { email: string }[] | null) ?? [])[0]?.email;
  const res = await resend.emails.send({
    from,
    to: opt.versEmail ?? me.email,
    cc: cc.length ? cc : undefined,
    replyTo,
    subject: test ? `[TEST] ${r.sujet}` : r.sujet,
    text: msg.text,
    html: habillerEmail(msg.html),
  });
  if (res.error) return { sent: false, reason: res.error.message };
  return { sent: true };
}
