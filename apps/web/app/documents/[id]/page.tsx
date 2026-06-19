import { DocumentDetailsPanel } from "@/components/documents/document-details-panel";
import { getBureaux, getCurrentUser, getDirections, getDocumentById, getServices } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DocumentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [document, directions, services, bureaux, currentUser] = await Promise.all([
    getDocumentById(params.id),
    getDirections(),
    getServices(),
    getBureaux(),
    getCurrentUser()
  ]);

  return (
    <DocumentDetailsPanel
      directions={directions ?? []}
      services={services ?? []}
      bureaux={bureaux ?? []}
      document={document}
      currentUser={currentUser?.user ?? null}
    />
  );
}
