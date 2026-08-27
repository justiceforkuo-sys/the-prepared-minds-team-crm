import { notFound } from "next/navigation";
import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { PeoplePanel } from "./people-panel";
import { PayoutPanel } from "./payout-panel";
import { OvbImportPanel } from "./ovb-import-panel";

export default async function AdminPage() {
  const person = await getCurrentPerson();
  if (!person) return null;
  if (!person.is_admin) notFound();

  const supabase = await createClient();
  const { data: people } = await supabase.from("people").select("*").order("name");

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Admin</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Édition complète des fiches et des décomptes — visible uniquement par toi.
      </p>

      <PeoplePanel people={people ?? []} meId={person.id} />

      <div className="mt-4">
        <PayoutPanel people={people ?? []} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <OvbImportPanel />
      </div>
    </div>
  );
}
