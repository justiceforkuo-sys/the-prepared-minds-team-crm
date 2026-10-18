import { strFromU8, unzipSync } from "fflate";

export interface ParsedConnection {
  first_name: string;
  last_name: string;
  linkedin_url: string;
  company: string | null;
  position: string | null;
  connected_on: string | null;
}

// Parseur CSV (guillemets, virgules et retours à la ligne dans les champs)
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// "16 Oct 2026" -> "2026-10-16"
export function parseLinkedinDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

// Normalise l'URL de profil : sans paramètres ni "/" final, hôte en minuscules.
export function normalizeProfileUrl(raw: string): string {
  const url = raw.trim();
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url.replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

// Les premières lignes de Connections.csv sont une note : les en-têtes commencent
// à la ligne qui contient "First Name" et "URL".
export function parseConnectionsCsv(text: string): ParsedConnection[] {
  const clean = text.replace(/^﻿/, "");
  const rows = parseCsv(clean);
  const headerIdx = rows.findIndex((r) => r.some((c) => c.trim() === "First Name") && r.some((c) => c.trim() === "URL"));
  if (headerIdx < 0) throw new Error("En-têtes introuvables : ce fichier ne ressemble pas à Connections.csv.");
  const header = rows[headerIdx].map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const iFirst = col("First Name");
  const iLast = col("Last Name");
  const iUrl = col("URL");
  const iCompany = col("Company");
  const iPosition = col("Position");
  const iDate = col("Connected On");

  const out: ParsedConnection[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const url = (r[iUrl] ?? "").trim();
    const first = (r[iFirst] ?? "").trim();
    if (!url || !first) continue;
    out.push({
      first_name: first,
      last_name: (r[iLast] ?? "").trim(),
      linkedin_url: normalizeProfileUrl(url),
      company: iCompany >= 0 ? (r[iCompany] ?? "").trim() || null : null,
      position: iPosition >= 0 ? (r[iPosition] ?? "").trim() || null : null,
      connected_on: iDate >= 0 ? parseLinkedinDate(r[iDate] ?? "") : null,
    });
  }
  return out;
}

// Accepte Connections.csv ou le zip complet de l'export LinkedIn.
export async function readLinkedinExport(file: File): Promise<ParsedConnection[]> {
  if (file.name.toLowerCase().endsWith(".zip")) {
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const name = Object.keys(files).find((n) => n.toLowerCase().endsWith("connections.csv"));
    if (!name) throw new Error("Connections.csv est absent de ce zip.");
    return parseConnectionsCsv(strFromU8(files[name]));
  }
  return parseConnectionsCsv(await file.text());
}
