import { BureauxPanel } from "@/components/organization/bureaux-panel";
import { SectionIntro } from "@/components/organization/section-intro";
import { getBureaux, getDirections, getServices, getUsers } from "@/lib/api";

type BureauxPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
  };
};

export default async function BureauxPage({ searchParams }: BureauxPageProps) {
  const [directions, services, bureaux, users] = await Promise.all([
    getDirections(),
    getServices(),
    getBureaux(),
    getUsers()
  ]);
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams?.pageSize ?? "10", 10) || 10);

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Organisation"
        title="Bureaux"
        description="Bureaux, rattachements et activite documentaire."
      />
      <BureauxPanel
        bureaux={bureaux ?? []}
        services={services ?? []}
        directions={directions ?? []}
        users={users ?? []}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
