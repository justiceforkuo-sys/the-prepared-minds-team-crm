const MONTHS: Record<string, string> = {
  janvier: "01",
  février: "02",
  fevrier: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  août: "08",
  aout: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  décembre: "12",
  decembre: "12",
};

const KNOWN_PARTNERS = ["AXA Belgium", "DELA Belgique", "P&V Belgique"];

const RANK_SUFFIX = /\s(JFA\d|FA|FC|CD|CR|CN)$/;
const TOTAL_LINE = /^Nombre\s*\/?\s*Total/i;
const HEADER_LINE = /^Client\b.*Partenaire.*Unités/i;
const AMOUNT = /(\d{1,3}(?: \d{3})*,\d{2})/;
const ROW_TAIL = new RegExp(`^(\\S+)\\s+${AMOUNT.source}\\s+${AMOUNT.source}$`);

function belgianNumber(raw: string): number {
  return parseFloat(raw.replace(/\s/g, "").replace(",", "."));
}

export interface ParsedOvbLine {
  collaborateur: string;
  client: string;
  partenaire: string;
  produit: string;
  montant: number;
  unites: number;
}

export interface ParsedOvbList {
  mois: string | null;
  lignes: ParsedOvbLine[];
  nonReconnues: string[];
}

export function parseOvbList(text: string): ParsedOvbList {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let mois: string | null = null;
  const monthMatch = text.match(
    new RegExp(`(${Object.keys(MONTHS).join("|")})\\s+(\\d{4})`, "i")
  );
  if (monthMatch) {
    const name = monthMatch[1].toLowerCase();
    mois = `${monthMatch[2]}-${MONTHS[name]}`;
  }

  const lignes: ParsedOvbLine[] = [];
  const nonReconnues: string[] = [];
  let currentCollab: string | null = null;

  for (const line of lines) {
    if (line.startsWith("Liste") || line.startsWith("OVB") || /^\d{2}\/\d{2}\/\d{4}/.test(line)) continue;
    if (HEADER_LINE.test(line)) continue;
    if (TOTAL_LINE.test(line)) continue;
    if (monthMatch && line.includes(monthMatch[0]) && line.length < monthMatch[0].length + 20) continue;

    const rankSuffix = line.match(RANK_SUFFIX);
    if (rankSuffix && !AMOUNT.test(line.slice(-8))) {
      currentCollab = line.slice(0, rankSuffix.index).trim();
      continue;
    }

    if (!currentCollab) continue;

    const partner = KNOWN_PARTNERS.find((p) => line.includes(p));
    if (!partner) {
      nonReconnues.push(line);
      continue;
    }

    const partnerIdx = line.indexOf(partner);
    const client = line.slice(0, partnerIdx).trim();
    const rest = line.slice(partnerIdx + partner.length).trim();
    const rowMatch = rest.match(ROW_TAIL);
    if (!client || !rowMatch) {
      nonReconnues.push(line);
      continue;
    }

    lignes.push({
      collaborateur: currentCollab,
      client,
      partenaire: partner,
      produit: rowMatch[1],
      montant: belgianNumber(rowMatch[2]),
      unites: belgianNumber(rowMatch[3]),
    });
  }

  return { mois, lignes, nonReconnues };
}
