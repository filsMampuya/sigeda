import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { BackButton } from "@/components/ui/back-button";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser, getDirections } from "@/lib/api";

export default async function NewDocumentPage() {
  const [directions, currentUser] = await Promise.all([getDirections(), getCurrentUser()]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Documents"
        title="Nouveau document"
        description="Enregistrement, numerisation et classement initial dans un meme parcours."
        actions={<BackButton fallbackHref="/documents" label="Retour aux documents" />}
      />
      <DocumentCreateForm
        directions={directions ?? []}
        currentUser={currentUser?.user ?? null}
      />
    </div>
  );
}
