import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { getBureaux, getCurrentUser, getDirections, getServices } from "@/lib/api";

export default async function NewDocumentPage() {
  const [directions, services, bureaux, currentUser] = await Promise.all([
    getDirections(),
    getServices(),
    getBureaux(),
    getCurrentUser()
  ]);

  return (
    <DocumentCreateForm
      directions={directions ?? []}
      services={services ?? []}
      bureaux={bureaux ?? []}
      currentUser={currentUser?.user ?? null}
    />
  );
}
