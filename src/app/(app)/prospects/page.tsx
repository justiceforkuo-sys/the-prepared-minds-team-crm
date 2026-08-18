import { getCurrentPerson } from "@/lib/current-person";
import { ProspectsBoard } from "./prospects-board";

export default async function ProspectsPage() {
  const person = await getCurrentPerson();
  if (!person) return null;

  return <ProspectsBoard ownerId={person.id} />;
}
