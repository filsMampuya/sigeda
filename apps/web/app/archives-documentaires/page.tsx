import { ArchiveFilters } from "@/components/archives/archive-filters";
import { DocumentArchiveTable } from "@/components/archives/document-archive-table";
import { Card } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getCurrentUser, getDirections, getDocumentArchivesWithFilters } from "@/lib/api";
import { formatStructureLabel } from "@/lib/format";

type DocumentArchivesPageProps = {
  searchParams?: {
    q?: string;
    year?: string;
    section?: string;
    partnerDirectionId?: string;
    page?: string;
    pageSize?: string;
  };
};

export default async function DocumentArchivesPage({ searchParams }: DocumentArchivesPageProps) {
  const params = new URLSearchParams();

  if (searchParams?.year) {
    params.set("year", searchParams.year);
  }

  if (searchParams?.q) {
    params.set("q", searchParams.q);
  }

  if (searchParams?.section) {
    params.set("section", searchParams.section);
  }

  if (searchParams?.partnerDirectionId) {
    params.set("partnerDirectionId", searchParams.partnerDirectionId);
  }

  params.set("page", searchParams?.page ?? "1");
  params.set("pageSize", searchParams?.pageSize ?? "10");

  const [archives, currentUser, directions] = await Promise.all([
    getDocumentArchivesWithFilters(params),
    getCurrentUser(),
    getDirections()
  ]);
  const directionScope = currentUser?.user?.directionId ?? null;
  const partnerDirections = (directions ?? []).filter(
    (direction) => direction.type === "Direction" || direction.type === "Direction Generale"
  );

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold text-brand-navy">Archives documentaires</h1>
        {directionScope && (
          <p className="text-xs text-slate-500">
            Périmètre :{" "}
            {formatStructureLabel(
              partnerDirections.find((direction) => direction.id === directionScope)?.code,
              partnerDirections.find((direction) => direction.id === directionScope)?.designation,
              directionScope
            )}
          </p>
        )}
      </Card>

      <ArchiveFilters
        q={searchParams?.q}
        year={searchParams?.year}
        section={searchParams?.section}
        partnerDirectionId={searchParams?.partnerDirectionId}
        partnerDirections={partnerDirections}
      />
      <DocumentArchiveTable rows={archives?.items ?? []} />
      {archives ? (
        <PaginationControls
          page={archives.page}
          pageSize={archives.pageSize}
          total={archives.total}
          totalPages={archives.totalPages}
        />
      ) : null}
    </div>
  );
}
