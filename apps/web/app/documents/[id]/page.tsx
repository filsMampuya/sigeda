import { DocumentDetailsPanel } from "@/components/documents/document-details-panel";
import { getCurrentUser, getDirections, getDocumentById } from "@/lib/api";

export default async function DocumentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [document, directions, currentUser] = await Promise.all([
    getDocumentById(params.id),
    getDirections(),
    getCurrentUser()
  ]);

  return <DocumentDetailsPanel currentUser={currentUser?.user ?? null} directions={directions ?? []} document={document} />;
}
