import { redirect } from "next/navigation";

// « Suivis » vit désormais dans Prospects (bandeau « À relancer ») ; on garde la route pour les anciens liens et favoris.
export default function SuivisPage() {
  redirect("/prospects?vue=a-relancer");
}
