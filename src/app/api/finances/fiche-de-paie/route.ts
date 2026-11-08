import { NextResponse } from "next/server";
import { getCurrentPerson } from "@/lib/current-person";
import { lireFichePaie } from "@/lib/fiche-paie-ai";

// Lecture d'une fiche de paie déposée par la personne connectée : le fichier est lu par Claude puis oublié (ni stocké ni
// journalisé). La réponse ne contient que les montants relus : la personne les vérifie avant tout enregistrement.

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // plafond de la requête sur Vercel : 4,5 Mo
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const me = await getCurrentPerson();
  if (!me) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Lecture automatique indisponible : saisis les montants à la main." }, { status: 503 });

  let file: File | null = null;
  try {
    const f = (await request.formData()).get("fiche");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "Fichier illisible." }, { status: 400 });
  }
  if (!file || file.size === 0) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop lourd (4 Mo maximum) : envoie une photo plus légère ou un PDF allégé." }, { status: 413 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Format non pris en charge : PDF, JPG, PNG ou WebP." }, { status: 415 });

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const fiche = await lireFichePaie(base64, file.type);
    if (fiche.net === null && fiche.brut === null) {
      return NextResponse.json({ error: "Je n'ai pas reconnu de fiche de paie dans ce fichier : saisis les montants à la main." }, { status: 422 });
    }
    return NextResponse.json({ fiche });
  } catch {
    return NextResponse.json({ error: "La lecture a échoué : saisis les montants à la main." }, { status: 502 });
  }
}
