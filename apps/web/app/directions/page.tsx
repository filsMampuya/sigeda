import { DirectionsPanel } from "@/components/organization/directions-panel";
import { SectionIntro } from "@/components/organization/section-intro";
import { getDepartements } from "@/lib/api";

export default async function DirectionsPage() {
  const departements = await getDepartements();
  const directions = (departements ?? []).filter(
    (departement) => departement.type === "Direction Generale" || departement.type === "Direction"
  );

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Organisation"
        title="Directions"
      />
      <DirectionsPanel directions={directions ?? []} />
    </div>
  );
}
