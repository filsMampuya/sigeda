import { ArchiveFolderCreateForm } from "@/components/archives/archive-folder-create-form";
import { ArchiveFilters } from "@/components/archives/archive-filters";
import { ArchiveFolderTable } from "@/components/archives/archive-folder-table";
import { BackButton } from "@/components/ui/back-button";
import { PageHeader } from "@/components/ui/page-header";
import { getArchiveFolders, getCurrentUser, getDirections } from "@/lib/api";

type ArchiveFoldersPageProps = {
  searchParams?: {
    q?: string;
    year?: string;
    section?: string;
    partnerDirectionId?: string;
    status?: string;
    dateField?: "createdAt" | "updatedAt";
    periodPreset?: "today" | "week" | "month" | "quarter" | "year" | "previousYear" | "custom";
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
  };
};

export default async function ArchiveFoldersPage({ searchParams }: ArchiveFoldersPageProps) {
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

  if (searchParams?.status) {
    params.set("status", searchParams.status);
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

  params.set("page", searchParams?.page ?? "1");
  params.set("pageSize", searchParams?.pageSize ?? "10");

  const [folders, currentUser, directions] = await Promise.all([
    getArchiveFolders(params),
    getCurrentUser(),
    getDirections()
  ]);
  const canManage = ["ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER"].includes(
    currentUser?.user?.role ?? ""
  );
  const canCreateFolder = Boolean(currentUser?.user?.bureauId);
  const partnerDirections = (directions ?? []).filter(
    (direction) => direction.type === "Direction" || direction.type === "Direction Generale"
  );

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        eyebrow="Classeurs annuels"
        title="Structure annuelle des classeurs"
        description="Suivi des classeurs actifs, archives et acces documentaires par bureau."
        actions={<BackButton fallbackHref="/documents" label="Retour aux documents" />}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)] xl:items-start">
        <div className="min-w-0">
          <ArchiveFilters
            q={searchParams?.q}
            year={searchParams?.year}
            section={searchParams?.section}
            partnerDirectionId={searchParams?.partnerDirectionId}
            status={searchParams?.status}
            dateField={searchParams?.dateField}
            periodPreset={searchParams?.periodPreset}
            dateFrom={searchParams?.dateFrom}
            dateTo={searchParams?.dateTo}
            partnerDirections={partnerDirections}
            showStatusFilter
          />
        </div>
        {canCreateFolder ? (
          <div className="min-w-0">
            <ArchiveFolderCreateForm
              currentUser={currentUser?.user ?? null}
              partnerDirections={partnerDirections}
            />
          </div>
        ) : null}
      </div>
      <ArchiveFolderTable
        rows={folders?.items ?? []}
        canManage={canManage}
        page={folders?.page ?? 1}
        pageSize={folders?.pageSize ?? 10}
        total={folders?.total ?? 0}
        totalPages={folders?.totalPages ?? 1}
      />
    </div>
  );
}
