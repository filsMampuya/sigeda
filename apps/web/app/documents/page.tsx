import { DocumentSearchFilters } from "@/components/documents/document-search-filters";
import { DocumentTable } from "@/components/documents/document-table";
import { getDocuments } from "@/lib/api";

type DocumentsPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
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

  const documents = await getDocuments(params);

  return (
    <div className="space-y-6">
      <DocumentSearchFilters q={searchParams?.q} status={searchParams?.status} />
      <DocumentTable rows={documents ?? []} />
    </div>
  );
}
