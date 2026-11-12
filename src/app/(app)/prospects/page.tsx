import { getCurrentPerson } from "@/lib/current-person";
import { ProspectsTabs } from "./prospects-tabs";

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const person = await getCurrentPerson();
  if (!person) return null;
  const { vue } = await searchParams;

  return <ProspectsTabs ownerId={person.id} vue={vue} />;
}
