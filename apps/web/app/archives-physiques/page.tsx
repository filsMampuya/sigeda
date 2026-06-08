import { PhysicalArchiveForm } from "@/components/archives/physical-archive-form";
import { ArchiveFilters } from "@/components/archives/archive-filters";
import { Card } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getDirections, getDocumentArchivesWithFilters, getPhysicalArchives } from "@/lib/api";

type PhysicalArchivesPageProps = {
  searchParams?: {
    q?: string;
    year?: string;
    section?: string;
    partnerDirectionId?: string;
    page?: string;
    pageSize?: string;
  };
};

export default async function PhysicalArchivesPage({ searchParams }: PhysicalArchivesPageProps) {
  const params = new URLSearchParams();
  const documentArchiveParams = new URLSearchParams();

  if (searchParams?.year) {
    params.set("year", searchParams.year);
    documentArchiveParams.set("year", searchParams.year);
  }

  if (searchParams?.q) {
    params.set("q", searchParams.q);
  }

  if (searchParams?.section) {
    params.set("section", searchParams.section);
    documentArchiveParams.set("section", searchParams.section);
  }

  if (searchParams?.partnerDirectionId) {
    params.set("partnerDirectionId", searchParams.partnerDirectionId);
    documentArchiveParams.set("partnerDirectionId", searchParams.partnerDirectionId);
  }

  params.set("page", searchParams?.page ?? "1");
  params.set("pageSize", searchParams?.pageSize ?? "10");
  documentArchiveParams.set("page", "1");
  documentArchiveParams.set("pageSize", "100");

  const [documentArchives, physicalArchives, directions] = await Promise.all([
    getDocumentArchivesWithFilters(documentArchiveParams),
    getPhysicalArchives(params),
    getDirections()
  ]);
  const partnerDirections = (directions ?? []).filter(
    (direction) => direction.type === "Direction" || direction.type === "Direction Generale"
  );

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-2xl font-semibold text-brand-navy">Archives physiques</h1>
      </Card>

      <ArchiveFilters
        q={searchParams?.q}
        year={searchParams?.year}
        section={searchParams?.section}
        partnerDirectionId={searchParams?.partnerDirectionId}
        partnerDirections={partnerDirections}
      />
      <PhysicalArchiveForm
        documentArchives={documentArchives?.items ?? []}
        physicalArchives={physicalArchives?.items ?? []}
      />
      {physicalArchives ? (
        <PaginationControls
          page={physicalArchives.page}
          pageSize={physicalArchives.pageSize}
          total={physicalArchives.total}
          totalPages={physicalArchives.totalPages}
        />
      ) : null}
    </div>
  );
}
