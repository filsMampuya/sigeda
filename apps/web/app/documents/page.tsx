import Link from "next/link";

import { DocumentSearchFilters } from "@/components/documents/document-search-filters";
import { DocumentTable } from "@/components/documents/document-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getBureaux, getCurrentUser, getDirections, getServices, searchDocuments } from "@/lib/api";
import { formatRoleLabel, formatStructureLabel } from "@/lib/format";

type DocumentsPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
    year?: string;
    directionId?: string;
    serviceId?: string;
    bureauId?: string;
    page?: string;
    pageSize?: string;
  };
};

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const params = new URLSearchParams();

  if (searchParams?.q) {
    params.set("q", searchParams.q);
  }

  if (searchParams?.status) {
    params.set("status", searchParams.status);
  }

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

  params.set("page", searchParams?.page ?? "1");
  params.set("pageSize", searchParams?.pageSize ?? "10");

  const [documents, directions, services, bureaux, currentUser] = await Promise.all([
    searchDocuments(params),
    getDirections(),
    getServices(),
    getBureaux(),
    getCurrentUser()
  ]);

  const direction = (directions ?? []).find((item) => item.id === searchParams?.directionId);
  const service = (services ?? []).find((item) => item.id === searchParams?.serviceId);
  const bureau = (bureaux ?? []).find((item) => item.id === searchParams?.bureauId);
  const scopeItems = [
    direction
      ? {
          key: "direction",
          label: "Direction",
          value: formatStructureLabel(direction.code, direction.designation)
        }
      : null,
    service
      ? {
          key: "service",
          label: "Service",
          value: formatStructureLabel(service.code, service.designation)
        }
      : null,
    bureau
      ? {
          key: "bureau",
          label: "Bureau",
          value: formatStructureLabel(bureau.code, bureau.designation)
        }
      : null,
    currentUser?.user?.role
      ? {
          key: "role",
          label: "Profil",
          value: formatRoleLabel(currentUser.user.role)
        }
      : null
  ].filter((value): value is { key: string; label: string; value: string } => Boolean(value));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Documents</h1>
        </div>
        <Link
          href="/documents/new"
          className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white"
        >
          Nouveau
        </Link>
      </div>
      <DocumentSearchFilters
        q={searchParams?.q}
        status={searchParams?.status}
        year={searchParams?.year}
        scopeItems={scopeItems}
      />
      <DocumentTable rows={documents?.items ?? []} />
      {documents ? (
        <PaginationControls
          page={documents.page}
          pageSize={documents.pageSize}
          total={documents.total}
          totalPages={documents.totalPages}
        />
      ) : null}
    </div>
  );
}
