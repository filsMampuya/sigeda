import { SectionIntro } from "@/components/organization/section-intro";
import { ServicesPanel } from "@/components/organization/services-panel";
import { getDirections, getServices } from "@/lib/api";

export default async function ServicesPage() {
  const [directions, services] = await Promise.all([getDirections(), getServices()]);

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Organisation"
        title="Services"
        description="Rattachement des services aux directions et structuration des espaces metiers de travail."
      />
      <ServicesPanel services={services ?? []} directions={directions ?? []} />
    </div>
  );
}
