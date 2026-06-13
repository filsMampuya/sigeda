import { DirectionsPanel } from "@/components/organization/directions-panel";
import { SectionIntro } from "@/components/organization/section-intro";
import { getDepartements } from "@/lib/api";

type DirectionsPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
  };
};

export default async function DirectionsPage({ searchParams }: DirectionsPageProps) {
  const departements = await getDepartements();
  const directions = (departements ?? []).filter(
    (departement) => departement.type === "Direction Generale" || departement.type === "Direction"
  );
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams?.pageSize ?? "10", 10) || 10);

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Organisation"
        title="Directions"
        description="Pilotage des directions generales et operationnelles."
      />
      <DirectionsPanel directions={directions ?? []} page={page} pageSize={pageSize} />
    </div>
  );
}
