import { Award } from "lucide-react";

export function StubPage({ title, description }: { title?: string; description: string }) {
  return (
    <div>
      {title && <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>}
      <div className="mt-4 rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
        <Award size={22} className="mx-auto mb-2 text-[#c3cddc]" />
        <div>{description}</div>
      </div>
    </div>
  );
}
