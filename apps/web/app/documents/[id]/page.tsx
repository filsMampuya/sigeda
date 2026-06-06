import { DocumentDetailsPanel } from "@/components/documents/document-details-panel";
import { getDocumentById } from "@/lib/api";

export default async function DocumentDetailPage({
  params
}: {
  params: { id: string };
}) {
  const document = await getDocumentById(params.id);

  return <DocumentDetailsPanel document={document} />;
}
