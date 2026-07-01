import { ArchiveFolderDocumentsTable } from "@/components/archives/archive-folder-documents-table";
import { ArchiveFolderPrintActions } from "@/components/archives/archive-folder-print-actions";
import { BackButton } from "@/components/ui/back-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getArchiveFolderDocuments } from "@/lib/api";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

type ArchiveFolderDetailsPageProps = {
  params: {
    id: string;
  };
};

export default async function ArchiveFolderDetailsPage({ params }: ArchiveFolderDetailsPageProps) {
  const payload = await getArchiveFolderDocuments(params.id);

  if (!payload) {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <h1 className="text-2xl font-semibold text-brand-navy">Classeur introuvable</h1>
          <p className="mt-2 text-sm text-slate-600">Le classeur demande est inaccessible ou inexistant.</p>
        </Card>
      </div>
    );
  }

  const { folder, items } = payload;
  const generatedAt = new Date().toISOString();
  const entryCount = items.filter((item) => item.movementType === "ENTREE").length;
  const outputCount = items.filter((item) => item.movementType === "SORTIE").length;
  const folderTitle =
    folder.folderType === "CORRESPONDANCE"
      ? formatStructureLabel(folder.partnerDirectionCode, folder.partnerDirectionName)
      : folder.label ?? folder.description ?? "Classeur annuel";

  return (
    <div className="space-y-4 print:space-y-0">
      <PageHeader
        eyebrow="Contenu du classeur"
        title={folderTitle}
        description={`Bureau ${formatStructureLabel(folder.bureauCode, folder.bureauName)} | Annee ${folder.year} | Direction courante ${formatStructureLabel(folder.ownerDirectionCode, folder.ownerDirectionName)}`}
        actions={
          <>
            <BackButton fallbackHref="/classeurs-annuels" label="Retour aux classeurs" />
            <ArchiveFolderPrintActions />
          </>
        }
      />

      <Card className="print-report-shell hidden border-[color:var(--border)] px-6 py-5 print:block">
        <div className="border-b border-slate-300 pb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">SIGEDA</p>
          <h1 className="mt-2 text-2xl font-semibold text-brand-navy">Hotel des Monnaies</h1>
          <p className="mt-1 text-sm text-slate-600">Banque Centrale du Congo</p>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Inventaire du classeur annuel</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <p>
            <span className="font-medium text-slate-900">Annee :</span> {folder.year}
          </p>
          <p>
            <span className="font-medium text-slate-900">Bureau :</span>{" "}
            {formatStructureLabel(folder.bureauCode, folder.bureauName)}
          </p>
          <p>
            <span className="font-medium text-slate-900">Direction courante :</span>{" "}
            {formatStructureLabel(folder.ownerDirectionCode, folder.ownerDirectionName)}
          </p>
          <p>
            <span className="font-medium text-slate-900">
              {folder.folderType === "CORRESPONDANCE" ? "Direction partenaire :" : "Libelle :"}
            </span>{" "}
            {folderTitle}
          </p>
          <p>
            <span className="font-medium text-slate-900">Statut :</span> {folder.status}
          </p>
          <p>
            <span className="font-medium text-slate-900">Section Entree :</span> {entryCount} document(s)
          </p>
          <p>
            <span className="font-medium text-slate-900">Section Sortie :</span> {outputCount} document(s)
          </p>
          <p>
            <span className="font-medium text-slate-900">Genere le :</span> {formatShortDate(generatedAt)}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[color:var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total documents</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{items.length}</p>
        </Card>
        <Card className="border-[color:var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Section Entree</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{entryCount}</p>
        </Card>
        <Card className="border-[color:var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Section Sortie</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{outputCount}</p>
        </Card>
      </div>

      <ArchiveFolderDocumentsTable rows={items} />
    </div>
  );
}
