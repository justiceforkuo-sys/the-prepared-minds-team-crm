import { getCurrentPerson } from "@/lib/current-person";
import { createClient } from "@/utils/supabase/server";
import { CartographieBoard } from "./cartographie-board";

export default async function CartographiePage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, address, locality, lat, lng, owner:people(name)")
    .not("lat", "is", null)
    .not("lng", "is", null);

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Cartographie</h2>
      <p className="mb-4 mt-1 text-xs text-muted">Répartition géographique de tes clients (et ceux de ton équipe).</p>
      <CartographieBoard
        isAdmin={person.is_admin}
        clients={
          (clients ?? []) as unknown as {
            id: string;
            name: string;
            address: string | null;
            locality: string | null;
            lat: number;
            lng: number;
            owner: { name: string } | null;
          }[]
        }
      />
    </div>
  );
}
