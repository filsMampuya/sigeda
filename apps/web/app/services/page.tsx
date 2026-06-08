import { SectionIntro } from "@/components/organization/section-intro";
import { ServicesPanel } from "@/components/organization/services-panel";
import { getBureaux, getDirections, getServices, getUsers } from "@/lib/api";

export default async function ServicesPage() {
  const [directions, services, bureaux, users] = await Promise.all([
    getDirections(),
    getServices(),
    getBureaux(),
    getUsers()
  ]);

  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Organisation" title="Services" />
      <ServicesPanel
        services={services ?? []}
        directions={directions ?? []}
        bureaux={bureaux ?? []}
        users={users ?? []}
      />
    </div>
  );
}
