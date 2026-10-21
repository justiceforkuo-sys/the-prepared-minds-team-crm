export function fmtEUR(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("fr-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-BE", { day: "2-digit", month: "short" });
}
