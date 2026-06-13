import { Injectable } from "@nestjs/common";
import { MovementType, type Department, type DocumentArchive, type User } from "@sigeda/database";
import type { DocumentArchiveListItem, PaginatedResult } from "@sigeda/shared/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { DepartmentsService } from "../departments/departments.service.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import type { ListDocumentArchivesQueryDto } from "./dto/list-document-archives-query.dto.js";

type ArchiveWithRelations = DocumentArchive & {
  document: {
    id: string;
    reference: string;
    referenceNumber: number;
    title: string;
    subject: string | null;
    type: string;
    status: string;
    confidentiality: string | null;
    createdAt: Date;
    updatedAt: Date;
    emitterDirectionId: string;
    emitterDirection: Department;
    recipients: Array<{
      kind: "RECEIVER" | "COPY";
      direction: Department;
    }>;
  };
  folder: {
    id: string;
    status: "ACTIVE" | "ARCHIVED";
    ownerDirectionId: string;
    partnerDirectionId: string;
    ownerDirection: Department;
  };
};

type ArchiveSortField =
  | "reference"
  | "title"
  | "movementType"
  | "direction"
  | "status"
  | "year"
  | "archivedAt"
  | "updatedAt";
type SortDirection = "asc" | "desc";

@Injectable()
export class DocumentArchivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly departments: DepartmentsService
  ) {}

  async list(query: ListDocumentArchivesQueryDto, principal: AuthenticatedPrincipal): Promise<PaginatedResult<DocumentArchiveListItem>> {
    const [archives, user] = await Promise.all([
      this.prisma.documentArchive.findMany({
        include: {
          document: {
            include: {
              emitterDirection: true,
              recipients: {
                include: {
                  direction: true
                }
              }
            }
          },
          folder: {
            include: {
              ownerDirection: true
            }
          }
        },
        orderBy: [{ document: { updatedAt: "desc" } }, { archivedAt: "desc" }]
      }),
      this.prisma.user.findUnique({
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
      })
    ]);

    const scopedArchives = scopeArchives(archives, user);
    const mapped = scopedArchives.map(mapArchive);
    const filters = parseArchiveQuery(query);
    const filtered = sortArchives(applyArchiveFilters(mapped, query), filters.sortBy, filters.sortDir);
    return paginate(filtered, query);
  }

  async syncForCreatedDocument(input: {
    documentId: string;
    year: number;
    bureauId: string;
    emitterDirectionId: string;
    receiverDirectionIds: string[];
    copyDirectionIds: string[];
    archivedById: string;
  }) {
    const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);
    const partners = Array.from(new Set([...input.receiverDirectionIds, ...input.copyDirectionIds].filter(Boolean)));

    if (ownerDirection.id === input.emitterDirectionId) {
      return this.createArchives(input, partners, "SORTIE");
    }

    return this.createArchives(input, [input.emitterDirectionId], "ENTREE");
  }

  private async createArchives(
    input: {
      documentId: string;
      year: number;
      bureauId: string;
      archivedById: string;
    },
    partnerDirectionIds: string[],
    movementType: MovementType
  ) {
    const archives = [];

    for (const partnerDirectionId of partnerDirectionIds) {
      const folder = await this.folders.findActiveForArchiving({
        year: input.year,
        bureauId: input.bureauId,
        partnerDirectionId
      });

      archives.push(
        await this.prisma.documentArchive.upsert({
          where: {
            documentId_bureauId_folderId_movementType: {
              documentId: input.documentId,
              bureauId: input.bureauId,
              folderId: folder.id,
              movementType
            }
          },
          update: {},
          create: {
            documentId: input.documentId,
            bureauId: input.bureauId,
            folderId: folder.id,
            movementType,
            archivedById: input.archivedById
          }
        })
      );
    }

    return archives;
  }
}

function mapArchive(archive: ArchiveWithRelations): DocumentArchiveListItem {
  const partnerDirections =
    archive.movementType === "SORTIE"
      ? archive.document.recipients
          .filter((recipient) => recipient.kind === "RECEIVER" || recipient.kind === "COPY")
          .map((recipient) => recipient.direction)
      : [archive.document.emitterDirection];

  return {
    id: archive.id,
    year: archive.document.createdAt.getUTCFullYear(),
    documentId: archive.documentId,
    ownerDirectionId: archive.folder.ownerDirectionId,
    directionId: archive.folder.ownerDirectionId,
    serviceId: undefined,
    bureauId: archive.bureauId,
    folderId: archive.folderId,
    movementType: archive.movementType,
    archivedAt: archive.archivedAt.toISOString(),
    updatedAt: archive.document.updatedAt.toISOString(),
    archivedBy: archive.archivedById,
    archiveFolderId: archive.folderId,
    documentReference: archive.document.reference,
    documentTitle: archive.document.title || archive.document.subject || archive.document.reference,
    referenceNumber: archive.document.referenceNumber,
    emitterDirectionCode: archive.document.emitterDirection.code,
    emitterDirectionName: archive.document.emitterDirection.designation,
    currentDirectionCode: archive.folder.ownerDirection.code,
    currentDirectionName: archive.folder.ownerDirection.designation,
    folderStatus: archive.folder.status,
    partnerDirectionIds: partnerDirections.map((direction) => direction.id),
    partnerDirectionCodes: partnerDirections.map((direction) => direction.code),
    partnerDirectionNames: partnerDirections.map((direction) => direction.designation),
    documentCreatedAt: archive.document.createdAt.toISOString(),
    documentStatus: archive.document.status as DocumentArchiveListItem["documentStatus"],
    confidentialityLevel: (archive.document.confidentiality ?? undefined) as DocumentArchiveListItem["confidentialityLevel"]
  };
}

function scopeArchives(archives: ArchiveWithRelations[], user: (User & { role: { code: string }; department: DepartmentNode }) | null) {
  if (!user || ["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(user.role.code)) {
    return archives;
  }

  const scope = resolveDepartmentScope(user.department);

  if (!scope.directionId) {
    return [];
  }

  if (user.role.code === "DIRECTEUR") {
    return archives.filter((archive) => archive.folder.ownerDirectionId === scope.directionId);
  }

  if (user.role.code === "MANAGER") {
    return archives.filter((archive) => archive.bureauId === scope.bureauId || archive.folder.ownerDirectionId === scope.directionId);
  }

  if (user.role.code === "AGENT") {
    return archives.filter((archive) => archive.bureauId === scope.bureauId);
  }

  return archives.filter((archive) => archive.folder.ownerDirectionId === scope.directionId);
}

type DepartmentNode = Parameters<typeof resolveDepartmentScope>[0];

function applyArchiveFilters(archives: DocumentArchiveListItem[], query: ListDocumentArchivesQueryDto) {
  const searchTerm = query.q?.trim().toLowerCase() ?? "";
  const year = query.year;
  const directionId = query.directionId;
  const partnerDirectionId = query.partnerDirectionId;
  const section = query.section;
  const period = resolveDateRange(query.periodPreset, query.dateFrom, query.dateTo);
  const dateField = query.dateField ?? "updatedAt";

  return archives.filter((archive) => {
    return (
      (!searchTerm ||
        archive.documentReference.toLowerCase().includes(searchTerm) ||
        archive.documentTitle.toLowerCase().includes(searchTerm) ||
        (archive.currentDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        archive.partnerDirectionNames.some((value) => value.toLowerCase().includes(searchTerm))) &&
      (!year || archive.year === year) &&
      (!directionId || archive.ownerDirectionId === directionId) &&
      (!partnerDirectionId || archive.partnerDirectionIds.includes(partnerDirectionId)) &&
      (!section || archive.movementType === section) &&
      matchesDateRange(dateField === "archivedAt" ? archive.archivedAt : archive.updatedAt, period)
    );
  });
}

function parseArchiveQuery(query: ListDocumentArchivesQueryDto) {
  return {
    sortBy: normalizeArchiveSortField(query.sortBy),
    sortDir: normalizeSortDirection(query.sortDir)
  };
}

function sortArchives(
  archives: DocumentArchiveListItem[],
  sortBy: ArchiveSortField | undefined,
  sortDir: SortDirection
) {
  if (!sortBy) {
    return [...archives].sort((left, right) => Date.parse(right.updatedAt ?? right.archivedAt) - Date.parse(left.updatedAt ?? left.archivedAt));
  }

  const direction = sortDir === "asc" ? 1 : -1;

  return [...archives].sort((left, right) => {
    switch (sortBy) {
      case "reference":
        return direction * left.documentReference.localeCompare(right.documentReference, "fr", { numeric: true });
      case "title":
        return direction * (left.documentTitle ?? "").localeCompare(right.documentTitle ?? "", "fr");
      case "movementType":
        return direction * left.movementType.localeCompare(right.movementType, "fr");
      case "direction":
        return direction * String(left.currentDirectionName ?? "").localeCompare(String(right.currentDirectionName ?? ""), "fr");
      case "status":
        return direction * String(left.documentStatus ?? "").localeCompare(String(right.documentStatus ?? ""), "fr");
      case "year":
        return direction * (left.year - right.year);
      case "archivedAt":
        return direction * (Date.parse(left.archivedAt) - Date.parse(right.archivedAt));
      case "updatedAt":
      default:
        return direction * (Date.parse(left.updatedAt ?? left.archivedAt) - Date.parse(right.updatedAt ?? right.archivedAt));
    }
  });
}

function paginate<T>(items: T[], query: ListDocumentArchivesQueryDto): PaginatedResult<T> {
  const page = Math.max(query.page ?? 1, 1);
  const pageSize = Math.max(query.pageSize ?? 10, 1);
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

function normalizeArchiveSortField(value?: string): ArchiveSortField | undefined {
  if (
    value === "reference" ||
    value === "title" ||
    value === "movementType" ||
    value === "direction" ||
    value === "status" ||
    value === "year" ||
    value === "archivedAt" ||
    value === "updatedAt"
  ) {
    return value;
  }

  return undefined;
}

function normalizeSortDirection(value?: string): SortDirection {
  return value === "asc" ? "asc" : "desc";
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

function matchesDateRange(value: string | undefined, range: { start?: Date; end?: Date } | null) {
  if (!range || !value) {
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
