import { CalendarPlus } from "lucide-react";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { fmtDate } from "@/lib/format";
import { googleCalendarUrl } from "@/lib/calendar";

export default async function SuivisPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .eq("owner_id", person.id)
    .not("next_follow_up", "is", null)
    .not("stage", "in", "(Perdu,Partenaire)")
    .order("next_follow_up");

  const today = new Date().toISOString().slice(0, 10);
  const list = prospects ?? [];
  const overdue = list.filter((p) => p.next_follow_up < today);
  const upcoming = list.filter((p) => p.next_follow_up >= today);

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Suivis</h2>

      {overdue.length > 0 && (
        <>
          <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-red">En retard</div>
          <div className="flex flex-col gap-2">
            {overdue.map((p) => (
              <Row key={p.id} name={p.name} stage={p.stage} date={p.next_follow_up} late />
            ))}
          </div>
        </>
      )}

      <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-muted">À venir</div>
      {upcoming.length === 0 && overdue.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
          Aucun suivi programmé. Un suivi non planifié est une vente perdue.
        </div>
      )}
      <div className="flex flex-col gap-2">
        {upcoming.map((p) => (
          <Row key={p.id} name={p.name} stage={p.stage} date={p.next_follow_up} />
        ))}
      </div>
    </div>
  );
}

function Row({ name, stage, date, late }: { name: string; stage: string; date: string; late?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-3.5">
      <div>
        <div className="text-sm font-bold text-ink">{name}</div>
        <div className="text-xs text-muted">{stage}</div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className={`text-xs font-bold ${late ? "text-red" : "text-gold-light"}`}>{fmtDate(date)}</div>
        <a
          href={googleCalendarUrl(`Suivi — ${name}`, `Prospect Prepared Minds Team — étape : ${stage}`, date)}
          target="_blank"
          rel="noopener noreferrer"
          title="Ajouter à Google Calendar"
          className="text-muted"
        >
          <CalendarPlus size={16} />
        </a>
      </div>
    </div>
  );
}
