import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCurrentPerson } from "@/lib/current-person";
import { GUIDE_MD, GUIDE_VERSION } from "@/content/guide-crm";

// Guide d'utilisation du CRM, lisible dans l'application par toute personne connectée (candidat retenu, nouveau, mentor, administrateur).
// Le texte vient du document « Guide d'utilisation du CRM Bâtisseur » (src/content/guide-crm.ts).

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return "";
}

const sections = GUIDE_MD.split("\n")
  .filter((l) => l.startsWith("## "))
  .map((l) => l.slice(3).trim());

const components: Components = {
  h2: ({ children }) => (
    <h2 id={slug(textOf(children))} className="mt-8 scroll-mt-4 border-b border-line pb-1 font-serif text-lg font-semibold text-ink">
      {children}
    </h2>
  ),
  p: ({ children }) => <p className="mt-2 text-[13px] leading-relaxed text-ink">{children}</p>,
  ul: ({ children }) => <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-relaxed text-ink">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-[13px] leading-relaxed text-ink">{children}</ol>,
  strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => <code className="rounded bg-card-alt px-1 py-0.5 text-[12px]">{children}</code>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-bold text-gold-light underline">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[420px] border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="bg-card-alt px-2.5 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted">{children}</th>,
  td: ({ children }) => <td className="border-t border-line px-2.5 py-1.5 align-top text-ink">{children}</td>,
};

export default async function GuidePage() {
  const me = await getCurrentPerson();
  if (!me) return null;
  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Guide d&apos;utilisation du CRM</h2>
      <p className="mt-1 text-xs text-muted">Version du {GUIDE_VERSION}. Pour toute question, ton parrain d&apos;abord, puis l&apos;administrateur de l&apos;équipe.</p>

      <nav className="mt-4 rounded-2xl border border-line bg-card p-3.5" aria-label="Sommaire du guide">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Sommaire</div>
        <ul className="gap-x-4 text-xs sm:columns-2">
          {sections.map((s) => (
            <li key={s} className="break-inside-avoid py-0.5">
              <a href={`#${slug(s)}`} className="text-ink hover:text-gold-light">
                {s}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="pb-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {GUIDE_MD}
        </ReactMarkdown>
      </article>
    </div>
  );
}
