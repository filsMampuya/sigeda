import Link from "next/link";

import { DocumentSearchFilters } from "@/components/documents/document-search-filters";
import { DocumentTable } from "@/components/documents/document-table";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  getArchiveFolders,
  getBureaux,
  getCurrentUser,
  getDirections,
  getDocumentAnnotationReport,
  getServices,
  searchDocuments
} from "@/lib/api";
import { formatRoleLabel, formatStructureLabel } from "@/lib/format";

type DocumentsPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
    year?: string;
    directionId?: string;
    emitterDirectionId?: string;
    receiverDirectionId?: string;
    copyDirectionId?: string;
    serviceId?: string;
    bureauId?: string;
    folderId?: string;
    reference?: string;
    referenceOperator?: "contains" | "equals";
    subject?: string;
    subjectOperator?: "contains" | "equals";
    type?: string;
    movementType?: string;
    signerName?: string;
    signerNameOperator?: "contains" | "equals";
    confidentialityLevel?: string;
    annotationDirectionId?: string;
    annotationState?: "with" | "without";
    annotationDateFrom?: string;
    annotationDateTo?: string;
    createdDate?: string;
    dateField?: "createdAt" | "updatedAt";
    periodPreset?: "today" | "week" | "month" | "quarter" | "year" | "previousYear" | "custom";
    dateFrom?: string;
    dateTo?: string;
    sortBy?: "reference" | "title" | "type" | "direction" | "movementType" | "status" | "confidentiality" | "createdAt" | "updatedAt";
    sortDir?: "asc" | "desc";
    page?: string;
    pageSize?: string;
  };
};

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const params = new URLSearchParams();

  if (searchParams?.q) {
    params.set("q", searchParams.q);
  }

  if (searchParams?.status) {
    params.set("status", searchParams.status);
  }

  if (searchParams?.year) {
    params.set("year", searchParams.year);
  }

  if (searchParams?.emitterDirectionId ?? searchParams?.directionId) {
    params.set("emitterDirectionId", searchParams?.emitterDirectionId ?? searchParams?.directionId ?? "");
  }

  if (searchParams?.receiverDirectionId) {
    params.set("receiverDirectionId", searchParams.receiverDirectionId);
  }

  if (searchParams?.copyDirectionId) {
    params.set("copyDirectionId", searchParams.copyDirectionId);
  }

  if (searchParams?.serviceId) {
    params.set("serviceId", searchParams.serviceId);
  }

  if (searchParams?.bureauId) {
    params.set("bureauId", searchParams.bureauId);
  }

  if (searchParams?.folderId) {
    params.set("folderId", searchParams.folderId);
  }

  if (searchParams?.reference) {
    params.set("reference", searchParams.reference);
  }

  if (searchParams?.referenceOperator) {
    params.set("referenceOperator", searchParams.referenceOperator);
  }

  if (searchParams?.subject) {
    params.set("subject", searchParams.subject);
  }

  if (searchParams?.subjectOperator) {
    params.set("subjectOperator", searchParams.subjectOperator);
  }

  if (searchParams?.type) {
    params.set("type", searchParams.type);
  }

  if (searchParams?.movementType) {
    params.set("movementType", searchParams.movementType);
  }

  if (searchParams?.signerName) {
    params.set("signerName", searchParams.signerName);
  }

  if (searchParams?.signerNameOperator) {
    params.set("signerNameOperator", searchParams.signerNameOperator);
  }

  if (searchParams?.confidentialityLevel) {
    params.set("confidentialityLevel", searchParams.confidentialityLevel);
  }

  if (searchParams?.annotationDirectionId) {
    params.set("annotationDirectionId", searchParams.annotationDirectionId);
  }

  if (searchParams?.annotationState) {
    params.set("annotationState", searchParams.annotationState);
  }

  if (searchParams?.annotationDateFrom) {
    params.set("annotationDateFrom", searchParams.annotationDateFrom);
  }

  if (searchParams?.annotationDateTo) {
    params.set("annotationDateTo", searchParams.annotationDateTo);
  }

  if (searchParams?.createdDate) {
    params.set("createdDate", searchParams.createdDate);
  }

  if (searchParams?.dateField) {
    params.set("dateField", searchParams.dateField);
  }

  if (searchParams?.periodPreset) {
    params.set("periodPreset", searchParams.periodPreset);
  }

  if (searchParams?.dateFrom) {
    params.set("dateFrom", searchParams.dateFrom);
  }

  if (searchParams?.dateTo) {
    params.set("dateTo", searchParams.dateTo);
  }

  if (searchParams?.sortBy) {
    params.set("sortBy", searchParams.sortBy);
  }

  if (searchParams?.sortDir) {
    params.set("sortDir", searchParams.sortDir);
  }

  params.set("page", searchParams?.page ?? "1");
  params.set("pageSize", searchParams?.pageSize ?? "10");

  const [documents, directions, services, bureaux, folders, currentUser, annotationReport] = await Promise.all([
    searchDocuments(params),
    getDirections(),
    getServices(),
    getBureaux(),
    getArchiveFolders(new URLSearchParams({ page: "1", pageSize: "200" })),
    getCurrentUser(),
    getDocumentAnnotationReport(params)
  ]);

  const emitterDirectionId = searchParams?.emitterDirectionId ?? searchParams?.directionId;
  const direction = (directions ?? []).find((item) => item.id === emitterDirectionId);
  const receiverDirection = (directions ?? []).find((item) => item.id === searchParams?.receiverDirectionId);
  const copyDirection = (directions ?? []).find((item) => item.id === searchParams?.copyDirectionId);
  const service = (services ?? []).find((item) => item.id === searchParams?.serviceId);
  const bureau = (bureaux ?? []).find((item) => item.id === searchParams?.bureauId);
  const folder = (folders?.items ?? []).find((item) => item.id === searchParams?.folderId);
  const scopeItems = [
    direction
      ? {
          key: "direction",
          label: "Emettrice",
          value: formatStructureLabel(direction.code, direction.designation)
        }
      : null,
    receiverDirection
      ? {
          key: "receiverDirection",
          label: "Destinataire",
          value: formatStructureLabel(receiverDirection.code, receiverDirection.designation)
        }
      : null,
    copyDirection
      ? {
          key: "copyDirection",
          label: "Copie",
          value: formatStructureLabel(copyDirection.code, copyDirection.designation)
        }
      : null,
    service
      ? {
          key: "service",
          label: "Service",
          value: formatStructureLabel(service.code, service.designation)
        }
      : null,
    bureau
      ? {
          key: "bureau",
          label: "Bureau",
          value: formatStructureLabel(bureau.code, bureau.designation)
        }
      : null,
    folder
      ? {
          key: "folder",
          label: "Classeur",
          value: formatStructureLabel(folder.partnerDirectionCode, folder.partnerDirectionName, folder.id)
        }
      : null,
    currentUser?.user?.role
      ? {
          key: "role",
          label: "Profil",
          value: formatRoleLabel(currentUser.user.role)
        }
      : null
  ].filter((value): value is { key: string; label: string; value: string } => Boolean(value));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Registre"
        title="Documents"
        actions={
          <Link
            href="/documents/new"
            className="inline-flex h-10 items-center rounded-xl bg-brand-navy px-4 text-sm font-medium text-white"
          >
            Nouveau document
          </Link>
        }
      />
      <DocumentSearchFilters
        q={searchParams?.q}
        status={searchParams?.status}
        year={searchParams?.year}
        emitterDirectionId={emitterDirectionId}
        receiverDirectionId={searchParams?.receiverDirectionId}
        copyDirectionId={searchParams?.copyDirectionId}
        serviceId={searchParams?.serviceId}
        bureauId={searchParams?.bureauId}
        folderId={searchParams?.folderId}
        reference={searchParams?.reference}
        referenceOperator={searchParams?.referenceOperator}
        subject={searchParams?.subject}
        subjectOperator={searchParams?.subjectOperator}
        type={searchParams?.type}
        movementType={searchParams?.movementType}
        signerName={searchParams?.signerName}
        signerNameOperator={searchParams?.signerNameOperator}
        confidentialityLevel={searchParams?.confidentialityLevel}
        annotationDirectionId={searchParams?.annotationDirectionId}
        annotationState={searchParams?.annotationState}
        annotationDateFrom={searchParams?.annotationDateFrom}
        annotationDateTo={searchParams?.annotationDateTo}
        createdDate={searchParams?.createdDate}
        dateField={searchParams?.dateField}
        periodPreset={searchParams?.periodPreset}
        dateFrom={searchParams?.dateFrom}
        dateTo={searchParams?.dateTo}
        directions={directions ?? []}
        services={services ?? []}
        bureaux={bureaux ?? []}
        folders={folders?.items ?? []}
        scopeItems={scopeItems}
      />
      <Card className="border-[color:var(--border)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Doctrine</p>
            <h2 className="text-sm font-semibold text-brand-navy">Annotations rattachees au document</h2>
            <p className="mt-1 text-sm text-slate-600">
              Les annotations sont consolidees exclusivement sur la fiche document. Les archives documentaires
              refletent cet etat mais ne portent plus leur propre cycle d&apos;annotation.
            </p>
          </div>
          <div className="grid min-w-[280px] gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Documents filtres</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{annotationReport?.totalDocuments ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Avec annotation</p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{annotationReport?.annotatedDocuments ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sans annotation</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{annotationReport?.unannotatedDocuments ?? 0}</p>
            </div>
          </div>
        </div>
        {annotationReport && (annotationReport.topEmitterDirections.length > 0 || annotationReport.topAnnotatingDirections.length > 0) ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Directions emettrices les plus annotees</p>
              <div className="mt-3 space-y-2">
                {annotationReport.topEmitterDirections.slice(0, 5).map((item) => (
                  <div key={item.directionId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span>{formatStructureLabel(item.code, item.name, item.directionId)}</span>
                    <span className="font-semibold text-brand-navy">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Directions annotatrices les plus actives</p>
              <div className="mt-3 space-y-2">
                {annotationReport.topAnnotatingDirections.slice(0, 5).map((item) => (
                  <div key={item.directionId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span>{formatStructureLabel(item.code, item.name, item.directionId)}</span>
                    <span className="font-semibold text-brand-navy">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Card>
      <DocumentTable
        rows={documents?.items ?? []}
        sortBy={searchParams?.sortBy}
        sortDir={searchParams?.sortDir}
        page={documents?.page ?? 1}
        pageSize={documents?.pageSize ?? 10}
        total={documents?.total ?? 0}
        totalPages={documents?.totalPages ?? 1}
      />
    </div>
  );
}
