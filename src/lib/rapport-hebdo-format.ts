// Rapports du vendredi : types et mise en forme (sans accès base de données, utilisable côté navigateur et côté serveur).

export type TacheKind = "chiffres" | "relances" | "liste100" | "appels" | "entrainement" | "dv_plan" | "recos" | "starter" | "fsma";

export interface Tache {
  id: string;
  kind: TacheKind;
  label: string;
  cible: number;
  /** Où le faire dans le CRM. */
  ou: string;
}

export interface Ligne {
  id: string;
  label: string;
  cible: number;
  realise: number;
  ok: boolean;
  detail?: string;
}

export interface Faits {
  // sur la période du rapport
  appels: number;
  joints: number;
  rdv: number;
  entrainements: number;
  noteMoyenne: number | null;
  chiffresJours: number;
  dvPlan: number;
  dvReal: number;
  recos: number;
  minutes: number;
  // situation à la date du rapport
  prospects: number;
  enListes: number;
  sansRelance: number;
  starterTotal: number;
  fsmaTotal: number;
  unites: number;
  dvRealTotal: number;
  entrainementsTotal: number;
  jour: number | null;
  plusDe6Mois: boolean;
  baseline?: boolean;
  /** JFA III et plus (coachs, administrateurs) : tâches adaptées. */
  cadre?: boolean;
  /** Dossier d'agrément FSMA déposé ou agrément obtenu : plus de tâche FSMA. */
  agree?: boolean;
}

export interface Redaction {
  ouverture: string;
  cloture: string;
}

export type Niveau = 1 | 2 | 3 | 4;

export const NIVEAU_LABEL: Record<Niveau, string> = {
  1: "Niveau 1 : objectifs tenus",
  2: "Niveau 2 : à corriger",
  3: "Niveau 3 : tâches non faites",
  4: "Niveau 4 : dernier rappel",
};
export const NIVEAU_COLOR: Record<Niveau, string> = { 1: "#1f8158", 2: "#c99a3f", 3: "#b3543a", 4: "#8b1a1a" };

export function fmtJourLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

export function sujetDe(niveau: Niveau, semaine: string, baseline: boolean): string {
  const j = fmtJourLong(semaine);
  if (baseline) return `Ton rapport du ${j} : ton point de départ et tes tâches`;
  if (niveau === 1) return `Ton rapport du ${j} : bravo, on monte d'un cran`;
  if (niveau === 2) return `Ton rapport du ${j} : à corriger`;
  if (niveau === 3) return `TRÈS IMPORTANT : ton rapport du ${j}, les tâches n'ont pas été faites`;
  return `DERNIER RAPPEL : ton rapport du ${j}, un rendez-vous est nécessaire`;
}

export const SLOGAN = "La chance accorde ses faveurs aux esprits avertis.";

/** Habillage officiel de l'email : bandeau Prepared Minds Team autour du rapport. */
export function habillerEmail(corps: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#222;max-width:640px;margin:0 auto;">
<div style="background:#0f1b33;color:#e8c872;padding:14px 18px;border-radius:10px 10px 0 0;"><b style="font-size:16px;">Prepared Minds Team</b><br><span style="font-size:12px;color:#cfd6e4;">Rapport hebdomadaire officiel</span></div>
<div style="border:1px solid #e3e6ec;border-top:none;padding:18px;border-radius:0 0 10px 10px;">
${corps}
</div></div>`;
}

export function prenomDe(name: string): string {
  const n = name.includes(",") ? name.split(",")[1] : name;
  return n.trim().split(/\s+/)[0] || name;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface MessageInput {
  prenom: string;
  niveau: Niveau;
  baseline: boolean;
  serie: number;
  bilan: Ligne[];
  taux: number | null;
  taches: Tache[];
  faits: Faits;
  redaction: Redaction;
}

function situation(f: Faits): string[] {
  const l: string[] = [];
  l.push(`Unités : ${Math.round(f.unites * 10) / 10}`);
  l.push(`Prospects dans ton suivi : ${f.prospects}${f.enListes ? ` (et ${f.enListes} contacts dans tes listes)` : ""}, dont ${f.sansRelance} sans date de relance`);
  l.push(`Appels cette semaine : ${f.appels}${f.appels ? ` (${f.joints} joints, ${f.rdv} rendez-vous fixé${f.rdv > 1 ? "s" : ""})` : ""}`);
  l.push(`Entraînements aux appels : ${f.entrainements}${f.noteMoyenne !== null ? ` (moyenne ${f.noteMoyenne}/10)` : ""}`);
  l.push(`Chiffres du jour saisis : ${f.chiffresJours} jour${f.chiffresJours > 1 ? "s" : ""} sur cette période`);
  l.push(`DV planifiés : ${f.dvPlan}, réalisés : ${f.dvReal}, recommandations : ${f.recos}`);
  l.push(`Temps passé dans le CRM : ${f.minutes} min sur cette période`);
  return l;
}

/** Message complet (texte brut pour copier/coller, HTML pour l'email). */
export function construireMessage(m: MessageInput): { text: string; html: string } {
  const banniere = m.niveau === 3 ? "⚠️ TRÈS IMPORTANT : merci de lire ce rapport en entier et de me répondre." : m.niveau === 4 ? "⚠️ DERNIER RAPPEL : merci de lire ce rapport en entier et de me répondre aujourd'hui." : "";
  const t: string[] = [];
  const h: string[] = [];
  if (banniere) {
    t.push(banniere, "");
    h.push(`<p style="color:#b3261e;font-size:16px;"><b>${esc(banniere)}</b></p>`);
  }
  t.push(`Salut ${m.prenom},`, "", m.redaction.ouverture, "");
  h.push(`<p>Salut ${esc(m.prenom)},</p>`, `<p>${esc(m.redaction.ouverture)}</p>`);

  if (m.bilan.length > 0) {
    t.push("BILAN DE LA SEMAINE (ce que je t'avais demandé)");
    h.push("<p><b>BILAN DE LA SEMAINE</b> (ce que je t'avais demandé)</p><ul>");
    for (const b of m.bilan) {
      const ligne = `${b.ok ? "✅" : "❌"} ${b.label} : ${b.detail ?? `${b.realise} sur ${b.cible}`}`;
      t.push(`- ${ligne}`);
      h.push(`<li>${esc(ligne)}</li>`);
    }
    const faites = m.bilan.filter((b) => b.ok).length;
    const res = `Résultat : ${faites} tâche${faites > 1 ? "s" : ""} faite${faites > 1 ? "s" : ""} sur ${m.bilan.length}${m.taux !== null ? ` (${Math.round(m.taux * 100)} %)` : ""}.`;
    t.push("", res, "");
    h.push(`</ul><p><b>${esc(res)}</b></p>`);
  }

  t.push("OÙ TU EN ES");
  h.push("<p><b>OÙ TU EN ES</b></p><ul>");
  for (const s of situation(m.faits)) {
    t.push(`- ${s}`);
    h.push(`<li>${esc(s)}</li>`);
  }
  t.push("");
  h.push("</ul>");

  t.push("À FAIRE CETTE SEMAINE");
  h.push("<p><b>À FAIRE CETTE SEMAINE</b></p><ol>");
  m.taches.forEach((x, i) => {
    t.push(`${i + 1}. ${x.label} (${x.ou})`);
    h.push(`<li>${esc(x.label)} <i>(${esc(x.ou)})</i></li>`);
  });
  t.push("");
  h.push("</ol>");

  t.push(m.redaction.cloture, "", "Justice", "", `« ${SLOGAN} »`, "", "Rapport officiel préparé par le CRM. Tu le retrouves dans le CRM, menu « Mon rapport ». Tu peux répondre directement à cet email.");
  h.push(`<p>${esc(m.redaction.cloture)}</p>`, "<p>Justice</p>", `<p><i>« ${SLOGAN} »</i></p>`, `<p style="color:#777;font-size:12px;">Rapport officiel préparé par le CRM. Tu le retrouves dans le CRM, menu « Mon rapport ». Tu peux répondre directement à cet email.</p>`);
  return { text: t.join("\n"), html: h.join("\n") };
}
