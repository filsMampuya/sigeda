import { Injectable } from "@nestjs/common";
import { type Department, type DepartmentType, type DocumentStatus, type User } from "@sigeda/database";
import type { ConfidentialityLevel, DocumentEntity, PaginatedResult } from "@sigeda/shared/types";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import type { SearchDocumentsQueryDto } from "./dto/search-documents-query.dto.js";

type DepartmentNode = Parameters<typeof resolveDepartmentScope>[0];

type SearchableDocument = {
  id: string;
  reference: string;
  referenceNumber: number;
  year: number;
  title: string;
  subject: string | null;
  summary: string | null;
  type: string;
  status: DocumentStatus;
  confidentiality: ConfidentialityLevel | null;
  createdAt: Date;
  updatedAt: Date;
  emitterDirectionId: string;
  emitterDirection: Department;
  author: {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
    email: string;
    department: DepartmentNode;
  } | null;
  recipients: Array<{
    directionId: string;
    kind: "RECEIVER" | "COPY";
    direction: Department;
  }>;
  signers: Array<{
    userId: string | null;
    fullName: string;
    functionTitle: string | null;
    departmentId: string;
    departmentType: DepartmentType;
    signingOrder: number | null;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    objectKey: string;
    mimeType: string;
    sizeBytes: bigint;
  }>;
  versions: Array<{
    id: string;
    version: number;
  }>;
  archives: Array<{
    id: string;
    bureauId: string;
    folderId: string;
    movementType: "ENTREE" | "SORTIE";
    archivedAt: Date;
    folder: {
      id: string;
      bureauId: string;
      partnerDirectionId: string;
      status: "ACTIVE" | "ARCHIVED";
    };
  }>;
};

type UserWithScope = User & {
  role: { code: string };
  department: DepartmentNode;
};

type TextFilterOperator = "contains" | "equals";
type DocumentSortField =
  | "reference"
  | "title"
  | "type"
  | "direction"
  | "movementType"
  | "status"
  | "confidentiality"
  | "createdAt"
  | "updatedAt";
type SortDirection = "asc" | "desc";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  indexPlan() {
    return {
      engine: "OpenSearch",
      node: process.env.OPENSEARCH_NODE ?? "http://localhost:9200",
      index: process.env.OPENSEARCH_INDEX_DOCUMENTS ?? "documents",
      fields: [
        "title",
        "reference",
        "subject",
        "summary",
        "ocrText",
        "keywords",
        "type",
        "status",
        "year",
        "emitterDirectionId",
        "receiverDirectionIds",
        "copyDirectionIds",
        "bureauIds",
        "folderIds",
        "movementType",
        "signerName",
        "confidentiality",
        "createdAt"
      ]
    };
  }

  async searchDocuments(
    query: SearchDocumentsQueryDto,
    principal: AuthenticatedPrincipal
  ): Promise<PaginatedResult<DocumentEntity>> {
    const filters = parseFilters(query);
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.max(query.pageSize ?? 10, 1);

    const user = await this.prisma.user.findUnique({
      where: { keycloakId: principal.sub },
      include: {
        role: true,
        department: {
          include: {
            parent: {
              include: {
                parent: true
              }
            }
          }
        }
      }
    });

    const documents = (await this.prisma.document.findMany({
      where: {
        ...(filters.q
          ? {
              OR: [
                { reference: { contains: filters.q, mode: "insensitive" } },
                { title: { contains: filters.q, mode: "insensitive" } },
                { subject: { contains: filters.q, mode: "insensitive" } },
                { summary: { contains: filters.q, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(filters.reference ? { reference: buildStringFilter(filters.reference, filters.referenceOperator) } : {}),
        ...(filters.subject ? { subject: buildStringFilter(filters.subject, filters.subjectOperator) } : {}),
        ...(filters.year ? { year: filters.year } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: { equals: filters.type, mode: "insensitive" } } : {}),
        ...(filters.confidentialityLevel ? { confidentiality: filters.confidentialityLevel } : {}),
        ...(filters.emitterDirectionId ? { emitterDirectionId: filters.emitterDirectionId } : {}),
        ...(filters.receiverDirectionId
          ? {
              recipients: {
                some: {
                  kind: "RECEIVER",
                  directionId: filters.receiverDirectionId
                }
              }
            }
          : {}),
        ...(filters.copyDirectionId
          ? {
              recipients: {
                some: {
                  kind: "COPY",
                  directionId: filters.copyDirectionId
                }
              }
            }
          : {}),
        ...(filters.folderId
          ? {
              archives: {
                some: {
                  folderId: filters.folderId
                }
              }
            }
          : {}),
        ...(filters.bureauId
          ? {
              archives: {
                some: {
                  bureauId: filters.bureauId
                }
              }
            }
          : {}),
        ...(filters.signerName
          ? {
              signers: {
                some: {
                  fullName: buildStringFilter(filters.signerName, filters.signerNameOperator)
                }
              }
            }
          : {}),
        ...(filters.movementType
          ? {
              archives: {
                some: {
                  movementType: filters.movementType
                }
              }
            }
          : {}),
        ...(filters.createdDate ? buildCreatedDateFilter(filters.createdDate) : {})
      },
      include: {
        emitterDirection: true,
        author: {
          include: {
            department: {
              include: {
                parent: {
                  include: {
                    parent: true
                  }
                }
              }
            }
          }
        },
        recipients: {
          include: {
            direction: true
          }
        },
        signers: {
          orderBy: [{ signingOrder: "asc" }, { createdAt: "asc" }]
        },
        attachments: true,
        versions: {
          select: {
            id: true,
            version: true
          },
          orderBy: {
            version: "desc"
          },
          take: 1
        },
        archives: {
          include: {
            folder: {
              select: {
                id: true,
                bureauId: true,
                partnerDirectionId: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    })) as unknown as SearchableDocument[];

    const scoped = documents.filter((document) => canAccessDocument(document, user));
    const filtered = scoped.filter((document) => matchesDerivedFilters(document, filters));
    const items = sortDocuments(filtered.map(mapSearchDocument), filters.sortBy, filters.sortDir);
    const total = items.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages
    };
  }
}

function parseFilters(query: SearchDocumentsQueryDto) {
  return {
    q: query.q?.trim() || "",
    year: query.year,
    status: normalizeDocumentStatus(query.status?.trim()),
    emitterDirectionId: normalizeString(query.emitterDirectionId ?? query.directionId),
    receiverDirectionId: normalizeString(query.receiverDirectionId),
    copyDirectionId: normalizeString(query.copyDirectionId),
    bureauId: normalizeString(query.bureauId),
    folderId: normalizeString(query.folderId),
    serviceId: normalizeString(query.serviceId),
    reference: normalizeString(query.reference),
    referenceOperator: normalizeTextFilterOperator(query.referenceOperator, "contains"),
    subject: normalizeString(query.subject),
    subjectOperator: normalizeTextFilterOperator(query.subjectOperator, "contains"),
    type: normalizeString(query.type),
    signerName: normalizeString(query.signerName),
    signerNameOperator: normalizeTextFilterOperator(query.signerNameOperator, "contains"),
    movementType: normalizeMovementType(query.movementType),
    confidentialityLevel: normalizeConfidentialityLevel(query.confidentialityLevel),
    createdDate: normalizeString(query.createdDate),
    dateField: query.dateField ?? "updatedAt",
    periodPreset: query.periodPreset,
    dateFrom: normalizeString(query.dateFrom),
    dateTo: normalizeString(query.dateTo),
    sortBy: normalizeDocumentSortField(query.sortBy),
    sortDir: normalizeSortDirection(query.sortDir)
  };
}

function canAccessDocument(document: SearchableDocument, user: UserWithScope | null) {
  if (!user || ["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(user.role.code)) {
    return true;
  }

  const userScope = resolveDepartmentScope(user.department);
  const authorScope = resolveDepartmentScope(document.author?.department ?? null);
  const archiveBureauIds = uniqueStrings(document.archives.map((archive) => archive.bureauId));
  const emitterDirectionId = document.emitterDirectionId;

  if (user.role.code === "DIRECTEUR") {
    return userScope.directionId === emitterDirectionId;
  }

  if (user.role.code === "MANAGER") {
    return Boolean(userScope.serviceId && userScope.serviceId === authorScope.serviceId);
  }

  return Boolean(userScope.bureauId && archiveBureauIds.includes(userScope.bureauId));
}

function matchesDerivedFilters(
  document: SearchableDocument,
  filters: ReturnType<typeof parseFilters>
) {
  const authorScope = resolveDepartmentScope(document.author?.department ?? null);
  const archiveBureauIds = uniqueStrings(document.archives.map((archive) => archive.bureauId));
  const period = resolveDateRange(filters.periodPreset, filters.dateFrom, filters.dateTo);
  const targetDate = filters.dateField === "createdAt" ? document.createdAt.toISOString() : document.updatedAt.toISOString();

  return (
    (!filters.serviceId || authorScope.serviceId === filters.serviceId) &&
    (!filters.bureauId || archiveBureauIds.includes(filters.bureauId)) &&
    (!filters.createdDate || matchesCreatedDate(document.createdAt, filters.createdDate)) &&
    matchesDateRange(targetDate, period)
  );
}

function mapSearchDocument(document: SearchableDocument): DocumentEntity {
  const receiverDirectionIds = document.recipients
    .filter((recipient) => recipient.kind === "RECEIVER")
    .map((recipient) => recipient.directionId);
  const copyDirectionIds = document.recipients
    .filter((recipient) => recipient.kind === "COPY")
    .map((recipient) => recipient.directionId);
  const attachments = document.attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.fileName,
    filePath: attachment.objectKey,
    mimeType: attachment.mimeType,
    fileUrl: `/api/v1/attachments/${attachment.id}/download`
  }));

  return {
    id: document.id,
    numeroReference: document.reference,
    reference: document.reference,
    year: document.year,
    referenceNumber: document.referenceNumber,
    referenceCode: document.emitterDirection.code,
    dateCreation: document.createdAt.toISOString(),
    dateDerniereModication: document.updatedAt.toISOString(),
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    user: {
      id: document.author?.id,
      nom: document.author?.nom ?? "SYSTEM",
      prenom: document.author?.prenom ?? "",
      matricule: document.author?.matricule ?? "SYSTEM",
      email: document.author?.email
    },
    type: document.type,
    direction: {
      id: document.emitterDirection.id,
      code: document.emitterDirection.code,
      designation: document.emitterDirection.designation
    },
    title: document.title,
    subject: document.subject ?? undefined,
    summary: document.summary ?? undefined,
    directionId: document.emitterDirectionId,
    serviceId: resolveDepartmentScope(document.author?.department ?? null).serviceId ?? undefined,
    bureauId: document.archives[0]?.bureauId ?? undefined,
    authorId: document.author?.id,
    authorName:
      [document.author?.nom, document.author?.prenom].filter(Boolean).join(" ").trim() || undefined,
    signerName: document.signers[0]?.fullName,
    signers: document.signers.map((signer) => ({
      userId: signer.userId ?? undefined,
      fullName: signer.fullName,
      functionTitle: signer.functionTitle ?? undefined,
      departmentId: signer.departmentId,
      departmentType: signer.departmentType,
      signingOrder: signer.signingOrder ?? undefined
    })),
    emitterDirectionId: document.emitterDirectionId,
    receiverDirectionIds,
    copyDirectionIds,
    movementType: document.archives[0]?.movementType,
    confidentialityLevel: document.confidentiality ?? undefined,
    status: document.status,
    keywords: [],
    version: document.versions[0]?.version ?? 1,
    attachments,
    fileName: attachments[0]?.name,
    urlFileName: attachments[0]?.fileUrl,
    fileUrl: attachments[0]?.fileUrl,
    mimeType: attachments[0]?.mimeType,
    archivedAt: document.archives[0]?.archivedAt.toISOString()
  };
}


function normalizeDocumentStatus(status?: string): DocumentStatus | undefined {
  if (
    status === "BROUILLON" ||
    status === "EN_VALIDATION" ||
    status === "VALIDE" ||
    status === "ARCHIVE" ||
    status === "REJETE"
  ) {
    return status;
  }

  return undefined;
}

function normalizeMovementType(value?: string): "ENTREE" | "SORTIE" | undefined {
  if (value === "ENTREE" || value === "SORTIE") {
    return value;
  }

  return undefined;
}

function normalizeConfidentialityLevel(value?: string): ConfidentialityLevel | undefined {
  if (
    value === "PUBLIC" ||
    value === "INTERNE" ||
    value === "CONFIDENTIEL" ||
    value === "SECRET" ||
    value === "TRES_SECRET"
  ) {
    return value;
  }

  return undefined;
}

function normalizeString(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeTextFilterOperator(
  value: string | undefined,
  defaultOperator: TextFilterOperator
): TextFilterOperator {
  if (value === "contains" || value === "equals") {
    return value;
  }

  return defaultOperator;
}
function buildStringFilter(value: string, operator: TextFilterOperator) {
  if (operator === "equals") {
    return { equals: value, mode: "insensitive" as const };
  }

  return { contains: value, mode: "insensitive" as const };
}

function normalizeDocumentSortField(value?: string): DocumentSortField | undefined {
  if (
    value === "reference" ||
    value === "title" ||
    value === "type" ||
    value === "direction" ||
    value === "movementType" ||
    value === "status" ||
    value === "confidentiality" ||
    value === "createdAt" ||
    value === "updatedAt"
  ) {
    return value;
  }

  return undefined;
}

function normalizeSortDirection(value?: string): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function sortDocuments(
  items: DocumentEntity[],
  sortBy: DocumentSortField | undefined,
  sortDir: SortDirection
) {
  const field = sortBy ?? "updatedAt";

  return [...items].sort((left, right) => {
    const direction = sortDir === "asc" ? 1 : -1;

    switch (field) {
      case "reference":
        return direction * left.numeroReference.localeCompare(right.numeroReference, "fr", { numeric: true });
      case "title":
        return direction * (left.title ?? "").localeCompare(right.title ?? "", "fr");
      case "type":
        return direction * String(left.type ?? "").localeCompare(String(right.type ?? ""), "fr");
      case "direction":
        return direction * (left.direction.designation ?? "").localeCompare(right.direction.designation ?? "", "fr");
      case "movementType":
        return direction * String(left.movementType ?? "").localeCompare(String(right.movementType ?? ""), "fr");
      case "status":
        return direction * String(left.status ?? "").localeCompare(String(right.status ?? ""), "fr");
      case "confidentiality":
        return direction * String(left.confidentialityLevel ?? "").localeCompare(String(right.confidentialityLevel ?? ""), "fr");
      case "createdAt":
        return direction * (Date.parse(left.createdAt) - Date.parse(right.createdAt));
      case "updatedAt":
      default:
        return direction * (Date.parse(left.updatedAt) - Date.parse(right.updatedAt));
    }
  });
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function buildCreatedDateFilter(createdDate: string) {
  const start = new Date(`${createdDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime())) {
    return {};
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    createdAt: {
      gte: start,
      lt: end
    }
  };
}

function matchesCreatedDate(value: Date, createdDate: string) {
  return value.toISOString().slice(0, 10) === createdDate;
}

function resolveDateRange(
  periodPreset?: "today" | "week" | "month" | "quarter" | "year" | "previousYear" | "custom",
  dateFrom?: string,
  dateTo?: string
) {
  const now = new Date();

  if (periodPreset === "custom") {
    const start = parseIsoDateStart(dateFrom);
    const end = parseIsoDateEnd(dateTo);

    if (!start && !end) {
      return null;
    }

    return { start, end };
  }

  if (!periodPreset) {
    return null;
  }

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  switch (periodPreset) {
    case "today":
      return {
        start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
      };
    case "week": {
      const weekday = now.getUTCDay();
      const diff = weekday === 0 ? 6 : weekday - 1;
      const start = new Date(Date.UTC(year, month, day - diff, 0, 0, 0, 0));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
      return { start, end };
    }
    case "month":
      return {
        start: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
      };
    case "quarter": {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return {
        start: new Date(Date.UTC(year, quarterStartMonth, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year, quarterStartMonth + 3, 0, 23, 59, 59, 999))
      };
    }
    case "year":
      return {
        start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
      };
    case "previousYear":
      return {
        start: new Date(Date.UTC(year - 1, 0, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999))
      };
    default:
      return null;
  }
}

function parseIsoDateStart(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseIsoDateEnd(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function matchesDateRange(value: string, range: { start?: Date; end?: Date } | null) {
  if (!range) {
    return true;
  }

  const target = Date.parse(value);

  if (Number.isNaN(target)) {
    return false;
  }

  if (range.start && target < range.start.getTime()) {
    return false;
  }

  if (range.end && target > range.end.getTime()) {
    return false;
  }

  return true;
}
