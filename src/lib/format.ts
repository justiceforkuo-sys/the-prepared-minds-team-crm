export function fmtEUR(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("fr-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-BE", { day: "2-digit", month: "short" });
}
