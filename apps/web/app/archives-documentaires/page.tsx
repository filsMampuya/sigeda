import { ArchiveFilters } from "@/components/archives/archive-filters";
import { DocumentArchiveTable } from "@/components/archives/document-archive-table";
import { BackButton } from "@/components/ui/back-button";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser, getDirections, getDocumentArchivesWithFilters } from "@/lib/api";
import { formatStructureLabel } from "@/lib/format";

type DocumentArchivesPageProps = {
  searchParams?: {
    q?: string;
    year?: string;
    section?: string;
    partnerDirectionId?: string;
    dateField?: "archivedAt" | "updatedAt";
    periodPreset?: "today" | "week" | "month" | "quarter" | "year" | "previousYear" | "custom";
    dateFrom?: string;
    dateTo?: string;
    sortBy?: "reference" | "title" | "movementType" | "direction" | "status" | "year" | "archivedAt" | "updatedAt";
    sortDir?: "asc" | "desc";
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

  if (searchParams?.dateField) {
    params.set("dateField", searchParams.dateField);
  }

  if (searchParams?.periodPreset) {
    params.set("periodPreset", searchParams.periodPreset);
  }

  if (searchParams?.dateFrom) {
    params.set("dateFrom", searchParams.dateFrom);
  }

  if (searchParams?.dateTo) {
    params.set("dateTo", searchParams.dateTo);
  }

  if (searchParams?.sortBy) {
    params.set("sortBy", searchParams.sortBy);
  }

  if (searchParams?.sortDir) {
    params.set("sortDir", searchParams.sortDir);
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
  const currentScopeDirection = partnerDirections.find((direction) => direction.id === directionScope);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Conservation"
        title="Archives documentaires"
        description={
          directionScope && currentScopeDirection
            ? `Perimetre actif : ${formatStructureLabel(currentScopeDirection.code, currentScopeDirection.designation, directionScope)}`
            : "Consultation des mouvements de classement et des archives documentaires."
        }
        actions={<BackButton fallbackHref="/documents" label="Retour aux documents" />}
      />

      <ArchiveFilters
        q={searchParams?.q}
        year={searchParams?.year}
        section={searchParams?.section}
        partnerDirectionId={searchParams?.partnerDirectionId}
        dateField={searchParams?.dateField}
        periodPreset={searchParams?.periodPreset}
        dateFrom={searchParams?.dateFrom}
        dateTo={searchParams?.dateTo}
        partnerDirections={partnerDirections}
      />
      <DocumentArchiveTable
        rows={archives?.items ?? []}
        sortBy={searchParams?.sortBy}
        sortDir={searchParams?.sortDir}
        page={archives?.page ?? 1}
        pageSize={archives?.pageSize ?? 10}
        total={archives?.total ?? 0}
        totalPages={archives?.totalPages ?? 1}
      />
    </div>
  );
}
