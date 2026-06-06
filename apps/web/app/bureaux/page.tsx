import { BureauxPanel } from "@/components/organization/bureaux-panel";
import { SectionIntro } from "@/components/organization/section-intro";
import { getBureaux, getDirections, getServices } from "@/lib/api";

export default async function BureauxPage() {
  const [services, bureaux] = await Promise.all([getServices(), getBureaux()]);

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Organisation"
        title="Bureaux"
        description="Dernier niveau organisationnel avant les documents, avec rattachement explicite aux services et directions."
      />
      <BureauxPanel
        bureaux={bureaux ?? []}
        services={services ?? []}
      />
    </div>
  );
}
