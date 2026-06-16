import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getDocumentArchiveById } from "@/lib/api";

type ArchiveDocumentAnnotationPageProps = {
  params: {
    id: string;
  };
};

export default async function ArchiveDocumentAnnotationPage({ params }: ArchiveDocumentAnnotationPageProps) {
  const archive = await getDocumentArchiveById(params.id);

  if (!archive) {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <h1 className="text-2xl font-semibold text-brand-navy">Document introuvable</h1>
          <p className="mt-2 text-sm text-slate-600">Le document a annoter est inaccessible ou inexistant.</p>
        </Card>
      </div>
    );
  }

  redirect(`/documents/${archive.documentId}#annotations`);
}
