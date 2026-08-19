export function generateSlug(name: string): string {
  const firstName = name.includes(",") ? name.split(",")[1] : name.split(" ")[0];
  return (firstName ?? name)
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

// Works with any Supabase client (browser or server/service role) — typed loosely
// since the exact generic client type differs between callers and isn't worth
// threading through here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateUniqueSlugFor(supabase: any, name: string): Promise<string> {
  const base = generateSlug(name) || "membre";
  let candidate = base;
  let i = 2;
  while (true) {
    const { data } = await supabase.from("people").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`;
    i++;
  }
}
