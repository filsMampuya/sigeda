import { GoneException, Injectable } from "@nestjs/common";
import type {
  PaginatedResult,
  PhysicalArchive,
  PhysicalArchiveListItem
} from "@sigeda/shared/types";
import type { Department, DocumentRecipient, Folder, User } from "@sigeda/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import type { ListPhysicalArchivesQueryDto } from "./dto/list-physical-archives-query.dto.js";

type PhysicalArchiveWithRelations = {
  id: string;
  documentArchiveId: string;
  documentId: string;
  directionId: string | null;
  partnerDirectionId: string | null;
  year: number;
  folderId: string;
  movementType: "ENTREE" | "SORTIE";
  site: string;
  batiment: string;
  salle: string;
  rayon: string;
  etagere: string;
  classeur: string;
  dossier: string;
  boiteArchive: string;
  classementKey: string;
  createdAt: Date;
  updatedAt: Date;
  documentArchive: {
    bureauId: string;
    movementType: "ENTREE" | "SORTIE";
    bureau: Department;
    folder: Folder;
  };
  document: {
    reference: string;
    title: string;
    subject: string | null;
    status: string;
    emitterDirection: Department;
    recipients: Array<DocumentRecipient & { direction: Department }>;
  };
  direction: Department | null;
  partnerDirection: Department | null;
  folder: Folder;
};

type UserWithScope = User & {
  role: { code: string };
  department: DepartmentNode;
};

type DepartmentNode = Parameters<typeof resolveDepartmentScope>[0];

@Injectable()
export class PhysicalArchivesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureAutomaticForDocumentArchives(input: {
    documentId: string;
    emitterDirectionId: string;
    year: number;
    documentArchives: Array<{
      id: string;
      documentId: string;
      folderId: string;
      movementType: "ENTREE" | "SORTIE";
    }>;
  }) {
    const folderIds = uniqueStrings(input.documentArchives.map((archive) => archive.folderId));
    const folders = await this.prisma.folder.findMany({
      where: {
        id: {
          in: folderIds
        }
      }
    });
    const folderMap = new Map(folders.map((folder) => [folder.id, folder]));

    const created: PhysicalArchive[] = [];

    for (const archive of input.documentArchives) {
      const folder = folderMap.get(archive.folderId);

      if (!folder) {
        continue;
      }

      const partnerDirectionId =
        archive.movementType === "SORTIE" ? folder.partnerDirectionId : input.emitterDirectionId;
      const persisted = await this.prisma.physicalArchive.upsert({
        where: {
          documentArchiveId_partnerDirectionId_year: {
            documentArchiveId: archive.id,
            partnerDirectionId: partnerDirectionId ?? null,
            year: input.year
          }
        },
        update: {},
        create: {
          documentArchiveId: archive.id,
          documentId: archive.documentId,
          directionId: folder.ownerDirectionId,
          partnerDirectionId: partnerDirectionId ?? null,
          year: input.year,
          folderId: folder.id,
          movementType: archive.movementType,
          site: AUTO_ARCHIVE_PLACEHOLDER,
          batiment: AUTO_ARCHIVE_PLACEHOLDER,
          salle: AUTO_ARCHIVE_PLACEHOLDER,
          rayon: AUTO_ARCHIVE_PLACEHOLDER,
          etagere: AUTO_ARCHIVE_PLACEHOLDER,
          classeur: folder.id,
          dossier: AUTO_ARCHIVE_PLACEHOLDER,
          boiteArchive: AUTO_ARCHIVE_PLACEHOLDER,
          classementKey: buildClassementKey(archive.movementType, input.year, folder.partnerDirectionId, archive.documentId)
        }
      });

      created.push(serializePhysicalArchive(persisted));
    }

    return created;
  }

  async list(query: ListPhysicalArchivesQueryDto, principal: { sub: string }): Promise<PaginatedResult<PhysicalArchiveListItem>> {
    const [physicalArchives, user] = await Promise.all([
      this.prisma.physicalArchive.findMany({
        include: {
          documentArchive: {
            include: {
              bureau: true,
              folder: true
            }
          },
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
          direction: true,
          partnerDirection: true,
          folder: true
        },
        orderBy: { createdAt: "desc" }
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

    const scopedRows = scopePhysicalArchives(physicalArchives.map(mapPhysicalArchive), user);
    const filtered = sortPhysicalArchives(applyPhysicalArchiveFilters(scopedRows, query));
    return paginate(filtered, query);
  }

  async create(input: {
    documentArchiveId: string;
    documentId: string;
    partnerDirectionId?: string;
    site: string;
    batiment: string;
    salle: string;
    rayon: string;
    etagere: string;
    classeur: string;
    dossier: string;
    boiteArchive: string;
  }) {
    void input;
    throw new GoneException(
      "Le classement manuel des archives physiques est desactive. Le classement est desormais determine automatiquement par les classeurs."
    );
  }
}

function mapPhysicalArchive(archive: PhysicalArchiveWithRelations): PhysicalArchiveListItem {
  const partnerDirectionCandidates =
    archive.documentArchive.movementType === "SORTIE"
      ? archive.document.recipients
          .filter((recipient: DocumentRecipient & { direction: Department }) => recipient.kind === "RECEIVER" || recipient.kind === "COPY")
          .map((recipient: DocumentRecipient & { direction: Department }) => recipient.direction)
      : [archive.document.emitterDirection];

  return {
    id: archive.id,
    documentArchiveId: archive.documentArchiveId,
    documentId: archive.documentId,
    directionId: archive.directionId ?? undefined,
    partnerDirectionId: archive.partnerDirectionId ?? undefined,
    year: archive.year,
    folderId: archive.folderId,
    movementType: archive.movementType,
    section: archive.movementType,
    site: archive.site,
    batiment: archive.batiment,
    salle: archive.salle,
    rayon: archive.rayon,
    etagere: archive.etagere,
    classeur: archive.classeur,
    dossier: archive.dossier,
    boiteArchive: archive.boiteArchive,
    classementKey: archive.classementKey,
    createdAt: archive.createdAt.toISOString(),
    updatedAt: archive.updatedAt.toISOString(),
    documentReference: archive.document.reference,
    documentTitle: archive.document.title || archive.document.subject || archive.document.reference,
    bureauId: archive.documentArchive.bureauId,
    directionCode: archive.direction?.code,
    directionName: archive.direction?.designation,
    bureauCode: archive.documentArchive.bureau.code,
    bureauName: archive.documentArchive.bureau.designation,
    partnerDirectionCode: archive.partnerDirection?.code,
    partnerDirectionName: archive.partnerDirection?.designation,
    partnerDirectionCodes: partnerDirectionCandidates.map((direction) => direction.code),
    partnerDirectionNames: partnerDirectionCandidates.map((direction) => direction.designation),
    documentStatus: archive.document.status as PhysicalArchiveListItem["documentStatus"],
    folderStatus: archive.folder.status
  };
}

function scopePhysicalArchives(
  rows: PhysicalArchiveListItem[],
  user: (UserWithScope | null)
) {
  if (!user || ["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(user.role.code)) {
    return rows;
  }

  const scope = resolveDepartmentScope(user.department);

  if (!scope.directionId) {
    return [];
  }

  if (user.role.code === "DIRECTEUR") {
    return rows.filter((archive) => !archive.directionId || archive.directionId === scope.directionId);
  }

  if (user.role.code === "MANAGER") {
    return rows.filter((archive) => archive.bureauId === scope.bureauId || archive.directionId === scope.directionId);
  }

  if (user.role.code === "AGENT") {
    return rows.filter((archive) => archive.bureauId === scope.bureauId);
  }

  return rows.filter((archive) => !archive.directionId || archive.directionId === scope.directionId);
}

function sortPhysicalArchives(rows: PhysicalArchiveListItem[]) {
  return [...rows].sort((left, right) => {
    if (left.section === right.section) {
      if (left.section === "SORTIE") {
        return Number.parseInt(right.classementKey ?? "0", 10) - Number.parseInt(left.classementKey ?? "0", 10);
      }

      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }

    return left.section === "SORTIE" ? -1 : 1;
  });
}

function applyPhysicalArchiveFilters(rows: PhysicalArchiveListItem[], query: ListPhysicalArchivesQueryDto) {
  const searchTerm = query.q?.trim().toLowerCase() ?? "";
  const year = query.year;
  const directionId = query.directionId;
  const partnerDirectionId = query.partnerDirectionId;
  const section = query.section;

  return rows.filter((row) => {
    return (
      (!searchTerm ||
        row.documentReference.toLowerCase().includes(searchTerm) ||
        row.documentTitle.toLowerCase().includes(searchTerm) ||
        row.classeur.toLowerCase().includes(searchTerm) ||
        (row.partnerDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        (row.bureauName ?? "").toLowerCase().includes(searchTerm)) &&
      (!year || row.year === year) &&
      (!directionId || row.directionId === directionId) &&
      (!partnerDirectionId || row.partnerDirectionId === partnerDirectionId) &&
      (!section || row.section === section)
    );
  });
}

function paginate<T>(items: T[], query: ListPhysicalArchivesQueryDto): PaginatedResult<T> {
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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

const AUTO_ARCHIVE_PLACEHOLDER = "A_RENSEIGNER";

function buildClassementKey(
  movementType: "ENTREE" | "SORTIE",
  year: number,
  partnerDirectionId: string,
  documentId: string
) {
  return movementType === "SORTIE"
    ? `${year}-${partnerDirectionId}`
    : `${year}-${documentId}`;
}

function serializePhysicalArchive(archive: {
  id: string;
  documentArchiveId: string;
  documentId: string;
  directionId: string | null;
  partnerDirectionId: string | null;
  year: number;
  folderId: string;
  movementType: "ENTREE" | "SORTIE";
  site: string;
  batiment: string;
  salle: string;
  rayon: string;
  etagere: string;
  classeur: string;
  dossier: string;
  boiteArchive: string;
  classementKey: string;
  createdAt: Date;
  updatedAt: Date;
}): PhysicalArchive {
  return {
    id: archive.id,
    documentArchiveId: archive.documentArchiveId,
    documentId: archive.documentId,
    directionId: archive.directionId ?? undefined,
    partnerDirectionId: archive.partnerDirectionId ?? undefined,
    year: archive.year,
    folderId: archive.folderId,
    movementType: archive.movementType,
    section: archive.movementType,
    site: archive.site,
    batiment: archive.batiment,
    salle: archive.salle,
    rayon: archive.rayon,
    etagere: archive.etagere,
    classeur: archive.classeur,
    dossier: archive.dossier,
    boiteArchive: archive.boiteArchive,
    classementKey: archive.classementKey,
    createdAt: archive.createdAt.toISOString(),
    updatedAt: archive.updatedAt.toISOString()
  };
}
