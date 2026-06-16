import { DocumentDetailsPanel } from "@/components/documents/document-details-panel";
import { getDirections, getDocumentById } from "@/lib/api";

export default async function DocumentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const [document, directions] = await Promise.all([getDocumentById(params.id), getDirections()]);

  return <DocumentDetailsPanel directions={directions ?? []} document={document} />;
}
