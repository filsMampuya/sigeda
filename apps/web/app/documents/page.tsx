import Link from "next/link";

import { DocumentSearchFilters } from "@/components/documents/document-search-filters";
import { DocumentTable } from "@/components/documents/document-table";
import { PageHeader } from "@/components/ui/page-header";
import { getArchiveFolders, getBureaux, getCurrentUser, getDirections, getServices, searchDocuments } from "@/lib/api";
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

  const [documents, directions, services, bureaux, folders, currentUser] = await Promise.all([
    searchDocuments(params),
    getDirections(),
    getServices(),
    getBureaux(),
    getArchiveFolders(new URLSearchParams({ page: "1", pageSize: "200" })),
    getCurrentUser()
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
