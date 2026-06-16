import { SectionIntro } from "@/components/organization/section-intro";
import { ServicesPanel } from "@/components/organization/services-panel";
import { getBureaux, getDirections, getServices, getUsers } from "@/lib/api";

type ServicesPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
  };
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const [directions, services, bureaux, users] = await Promise.all([
    getDirections(),
    getServices(),
    getBureaux(),
    getUsers(new URLSearchParams({ page: "1", pageSize: "500" }))
  ]);
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams?.pageSize ?? "10", 10) || 10);

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Organisation"
        title="Services"
        description="Services rattaches aux directions et acces a leur perimetre documentaire."
      />
      <ServicesPanel
        services={services ?? []}
        directions={directions ?? []}
        bureaux={bureaux ?? []}
        users={users?.items ?? []}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
