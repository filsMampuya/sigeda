import { DirectionsPanel } from "@/components/organization/directions-panel";
import { SectionIntro } from "@/components/organization/section-intro";
import { getDirections } from "@/lib/api";

export default async function DirectionsPage() {
  const directions = await getDirections();

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Organisation"
        title="Directions"
        description="Gestion des directions de l'Hotel des Monnaies et point d'entree de la hierarchie administrative."
      />
      <DirectionsPanel directions={directions ?? []} />
    </div>
  );
}
