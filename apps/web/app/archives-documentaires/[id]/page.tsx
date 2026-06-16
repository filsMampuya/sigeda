import { DocumentArchiveDetailsPanel } from "@/components/archives/document-archive-details-panel";
import { BackButton } from "@/components/ui/back-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getDocumentArchiveById } from "@/lib/api";
import { formatStructureLabel } from "@/lib/format";

type ArchiveDocumentDetailsPageProps = {
  params: {
    id: string;
  };
};

export default async function ArchiveDocumentDetailsPage({ params }: ArchiveDocumentDetailsPageProps) {
  const archive = await getDocumentArchiveById(params.id);

  if (!archive) {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <h1 className="text-2xl font-semibold text-brand-navy">Document classe introuvable</h1>
          <p className="mt-2 text-sm text-slate-600">Le document demande est inaccessible ou inexistant.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Consultation"
        title={archive.documentReference}
        description={`${formatStructureLabel(archive.currentDirectionCode, archive.currentDirectionName, archive.directionId)} | ${archive.documentTitle}`}
        actions={<BackButton fallbackHref="/archives-documentaires" label="Retour aux documents classes" />}
      />

      <DocumentArchiveDetailsPanel archive={archive} />
    </div>
  );
}
