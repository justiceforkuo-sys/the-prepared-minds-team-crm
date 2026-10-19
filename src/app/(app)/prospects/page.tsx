import { getCurrentPerson } from "@/lib/current-person";
import { ProspectsBoard } from "./prospects-board";

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const person = await getCurrentPerson();
  if (!person) return null;
  const { vue } = await searchParams;

  return <ProspectsBoard ownerId={person.id} vue={vue} />;
}
