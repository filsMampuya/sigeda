import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { BackButton } from "@/components/ui/back-button";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser, getDepartements, getDirections, getDocumentTypes, getUsers } from "@/lib/api";

export default async function NewDocumentPage() {
  const [directions, departments, users, currentUser, documentTypes] = await Promise.all([
    getDirections(),
    getDepartements(),
    getUsers(new URLSearchParams({ page: "1", pageSize: "500" })),
    getCurrentUser(),
    getDocumentTypes()
  ]);

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
        departments={departments ?? []}
        users={users?.items ?? []}
        currentUser={currentUser?.user ?? null}
        documentTypes={documentTypes ?? []}
      />
    </div>
  );
}
