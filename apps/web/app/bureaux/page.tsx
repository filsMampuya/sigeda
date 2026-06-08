import { BureauxPanel } from "@/components/organization/bureaux-panel";
import { SectionIntro } from "@/components/organization/section-intro";
import { getBureaux, getDirections, getServices, getUsers } from "@/lib/api";

export default async function BureauxPage() {
  const [directions, services, bureaux, users] = await Promise.all([
    getDirections(),
    getServices(),
    getBureaux(),
    getUsers()
  ]);

  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Organisation" title="Bureaux" />
      <BureauxPanel
        bureaux={bureaux ?? []}
        services={services ?? []}
        directions={directions ?? []}
        users={users ?? []}
      />
    </div>
  );
}
