import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { BackButton } from "@/components/ui/back-button";
import { PageHeader } from "@/components/ui/page-header";
import { getBureaux, getCurrentUser, getDirections, getServices, getUsers } from "@/lib/api";

export default async function NewDocumentPage() {
  const [directions, services, bureaux, currentUser, users] = await Promise.all([
    getDirections(),
    getServices(),
    getBureaux(),
    getCurrentUser(),
    getUsers(new URLSearchParams({ page: "1", pageSize: "500" }))
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
        services={services ?? []}
        bureaux={bureaux ?? []}
        users={users?.items ?? []}
        currentUser={currentUser?.user ?? null}
      />
    </div>
  );
}
