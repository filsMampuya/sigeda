import { ArchiveFilters } from "@/components/archives/archive-filters";
import { DocumentArchiveTable } from "@/components/archives/document-archive-table";
import { BackButton } from "@/components/ui/back-button";
import { PageHeader } from "@/components/ui/page-header";
import { getBureaux, getCurrentUser, getDirections, getDocumentArchivesWithFilters, getServices } from "@/lib/api";
import { formatStructureLabel } from "@/lib/format";

type DocumentArchivesPageProps = {
  searchParams?: {
    q?: string;
    year?: string;
    directionId?: string;
    serviceId?: string;
    bureauId?: string;
    section?: string;
    partnerDirectionId?: string;
    annotationDirectionId?: string;
    annotationState?: string;
    dateField?: "archivedAt" | "updatedAt";
    periodPreset?: "today" | "week" | "month" | "quarter" | "year" | "previousYear" | "custom";
    dateFrom?: string;
    dateTo?: string;
    annotationDateFrom?: string;
    annotationDateTo?: string;
    sortBy?: "reference" | "title" | "movementType" | "direction" | "year" | "archivedAt" | "updatedAt";
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

  if (searchParams?.directionId) {
    params.set("directionId", searchParams.directionId);
  }

  if (searchParams?.serviceId) {
    params.set("serviceId", searchParams.serviceId);
  }

  if (searchParams?.bureauId) {
    params.set("bureauId", searchParams.bureauId);
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

  if (searchParams?.annotationDirectionId) {
    params.set("annotationDirectionId", searchParams.annotationDirectionId);
  }

  if (searchParams?.annotationState) {
    params.set("annotationState", searchParams.annotationState);
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

  if (searchParams?.annotationDateFrom) {
    params.set("annotationDateFrom", searchParams.annotationDateFrom);
  }

  if (searchParams?.annotationDateTo) {
    params.set("annotationDateTo", searchParams.annotationDateTo);
  }

  if (searchParams?.sortBy) {
    params.set("sortBy", searchParams.sortBy);
  }

  if (searchParams?.sortDir) {
    params.set("sortDir", searchParams.sortDir);
  }

  params.set("page", searchParams?.page ?? "1");
  params.set("pageSize", searchParams?.pageSize ?? "10");

  const [archives, currentUser, directions, services, bureaux] = await Promise.all([
    getDocumentArchivesWithFilters(params),
    getCurrentUser(),
    getDirections(),
    getServices(),
    getBureaux()
  ]);
  const directionScope = currentUser?.user?.directionId ?? null;
  const serviceScope = currentUser?.user?.serviceId ?? null;
  const bureauScope = currentUser?.user?.bureauId ?? null;
  const currentRole = currentUser?.user?.role ?? "";
  const hasGlobalScope = ["DIRECTEUR_GENERAL", "DIRECTION_GENERALE", "ADMIN", "AUDITEUR"].includes(currentRole);
  const hasDirectionScope = currentRole === "DIRECTEUR";
  const hasServiceScope = ["MANAGER", "CHEF_SERVICE"].includes(currentRole);
  const partnerDirections = (directions ?? []).filter(
    (direction) => direction.type === "Direction" || direction.type === "Direction Generale"
  );
  const scopedDirections = hasGlobalScope
    ? partnerDirections
    : partnerDirections.filter((direction) => direction.id === directionScope);
  const scopedServices = hasGlobalScope
    ? (services ?? [])
    : hasDirectionScope
      ? (services ?? []).filter((service) => service.directionId === directionScope)
      : hasServiceScope
        ? (services ?? []).filter((service) => service.id === serviceScope)
        : [];
  const scopedBureaux = hasGlobalScope
    ? (bureaux ?? [])
    : hasDirectionScope
      ? (bureaux ?? []).filter((bureau) => bureau.directionId === directionScope)
      : hasServiceScope
        ? (bureaux ?? []).filter((bureau) => bureau.serviceId === serviceScope)
        : (bureaux ?? []).filter((bureau) => bureau.id === bureauScope);
  const currentScopeDirection = partnerDirections.find((direction) => direction.id === directionScope);

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        eyebrow="Classement"
        title="Documents classes"
        description={
          directionScope && currentScopeDirection
            ? `Perimetre actif : ${formatStructureLabel(currentScopeDirection.code, currentScopeDirection.designation, directionScope)}`
            : "Consultation des documents classes, des mouvements de classement et des annotations."
        }
        actions={<BackButton fallbackHref="/documents" label="Retour aux documents" />}
      />

      <ArchiveFilters
        q={searchParams?.q}
        year={searchParams?.year}
        directionId={searchParams?.directionId}
        serviceId={searchParams?.serviceId}
        bureauId={searchParams?.bureauId}
        section={searchParams?.section}
        partnerDirectionId={searchParams?.partnerDirectionId}
        annotationDirectionId={searchParams?.annotationDirectionId}
        annotationState={searchParams?.annotationState}
        dateField={searchParams?.dateField}
        periodPreset={searchParams?.periodPreset}
        dateFrom={searchParams?.dateFrom}
        dateTo={searchParams?.dateTo}
        annotationDateFrom={searchParams?.annotationDateFrom}
        annotationDateTo={searchParams?.annotationDateTo}
        partnerDirections={partnerDirections}
        directions={scopedDirections}
        services={scopedServices}
        bureaux={scopedBureaux}
        currentRole={currentRole}
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
