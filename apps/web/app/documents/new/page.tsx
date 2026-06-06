import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { getBureaux, getDirections, getServices } from "@/lib/api";

export default async function NewDocumentPage() {
  const [directions, services, bureaux] = await Promise.all([
    getDirections(),
    getServices(),
    getBureaux()
  ]);

  return (
    <DocumentCreateForm
      directions={directions ?? []}
      services={services ?? []}
      bureaux={bureaux ?? []}
    />
  );
}
