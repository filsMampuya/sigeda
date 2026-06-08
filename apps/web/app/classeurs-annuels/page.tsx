import { ArchiveFolderCreateForm } from "@/components/archives/archive-folder-create-form";
import { ArchiveFilters } from "@/components/archives/archive-filters";
import { ArchiveFolderTable } from "@/components/archives/archive-folder-table";
import { Card } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getArchiveFolders, getBureaux, getCurrentUser, getDirections } from "@/lib/api";

type ArchiveFoldersPageProps = {
  searchParams?: {
    q?: string;
    year?: string;
    section?: string;
    partnerDirectionId?: string;
    status?: string;
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

  params.set("page", searchParams?.page ?? "1");
  params.set("pageSize", searchParams?.pageSize ?? "10");

  const [folders, currentUser, directions, bureaux] = await Promise.all([
    getArchiveFolders(params),
    getCurrentUser(),
    getDirections(),
    getBureaux()
  ]);
  const canManage = ["ADMIN", "ARCHIVISTE", "DIRECTEUR", "CHEF_SERVICE", "CHEF_BUREAU"].includes(
    currentUser?.user?.role ?? ""
  );
  const partnerDirections = (directions ?? []).filter(
    (direction) => direction.type === "Direction" || direction.type === "Direction Generale"
  );

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Classeurs annuels</p>
        <h1 className="text-2xl font-semibold text-brand-navy">Structure annuelle des classeurs</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Chaque classeur est distingue par l&apos;annee, la direction, la direction partenaire et la section
          ENTREE ou SORTIE.
        </p>
      </Card>

      <ArchiveFilters
        q={searchParams?.q}
        year={searchParams?.year}
        section={searchParams?.section}
        partnerDirectionId={searchParams?.partnerDirectionId}
        status={searchParams?.status}
        partnerDirections={partnerDirections}
        showStatusFilter
      />
      {canManage ? (
        <ArchiveFolderCreateForm
          bureaux={(bureaux ?? []).filter((departement) => departement.type === "Bureau")}
          partnerDirections={partnerDirections}
        />
      ) : null}
      <ArchiveFolderTable rows={folders?.items ?? []} canManage={canManage} />
      {folders ? (
        <PaginationControls
          page={folders.page}
          pageSize={folders.pageSize}
          total={folders.total}
          totalPages={folders.totalPages}
        />
      ) : null}
    </div>
  );
}
