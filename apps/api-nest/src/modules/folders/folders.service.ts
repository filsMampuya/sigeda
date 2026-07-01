import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FolderStatus, FolderType, type Department, type Folder, type User } from "@sigeda/database";
import type {
  ArchiveFolderDocumentListItem,
  ArchiveFolderListItem,
  ClassificationFolderOption,
  PaginatedResult
} from "@sigeda/shared/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { DepartmentsService } from "../departments/departments.service.js";
import { DocumentTypesService } from "../document-types/document-types.service.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import type { ListFoldersQueryDto } from "./dto/list-folders-query.dto.js";

type FolderWithRelations = Folder & {
  bureau: Department;
  ownerDirection: Department;
  partnerDirection: Department | null;
  documentTypes: Array<{
    documentType: {
      id: string;
      code: string;
      label: string;
      description: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
  archives: Array<{ archivedAt: Date; movementType: "ENTREE" | "SORTIE" }>;
};

type FolderDetailWithRelations = Folder & {
  bureau: Department;
  ownerDirection: Department;
  partnerDirection: Department | null;
  archives: FolderDocumentArchiveWithRelations[];
};

type FolderDocumentArchiveWithRelations = {
  id: string;
  folderId: string;
  movementType: "ENTREE" | "SORTIE";
  archivedAt: Date;
  document: {
    id: string;
    reference: string;
    referenceNumber: number;
    title: string;
    subject: string | null;
    createdAt: Date;
    emitterDirection: Department;
    recipients: Array<{
      kind: "RECEIVER" | "COPY";
      direction: Department;
    }>;
    signers: Array<{
      fullName: string;
      functionTitle: string | null;
      signingOrder: number | null;
    }>;
  };
};

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departments: DepartmentsService,
    private readonly documentTypes: DocumentTypesService
  ) {}

  async list(query: ListFoldersQueryDto, principal: AuthenticatedPrincipal): Promise<PaginatedResult<ArchiveFolderListItem>> {
    const [folders, user, departments] = await Promise.all([
      this.prisma.folder.findMany({
        include: {
          bureau: true,
          ownerDirection: true,
          partnerDirection: true,
          documentTypes: {
            include: {
              documentType: true
            }
          },
          archives: {
            select: {
              archivedAt: true,
              movementType: true
            }
          }
        },
        orderBy: [{ updatedAt: "desc" }, { year: "desc" }, { createdAt: "desc" }]
      }),
      this.resolvePrincipalUser(principal),
      this.prisma.department.findMany()
    ]);

    const mapped = folders.map((folder) => mapFolder(folder, departments));
    const scopedFolders = scopeFolders(mapped, user, departments);
    const filtered = applyFolderFilters(scopedFolders, query);
    return paginate(filtered, query);
  }

  async getDocuments(folderId: string, principal: AuthenticatedPrincipal) {
    const [folder, user, departments] = await Promise.all([
      this.prisma.folder.findUnique({
        where: { id: folderId },
        include: {
          bureau: true,
          ownerDirection: true,
          partnerDirection: true,
          documentTypes: {
            include: {
              documentType: true
            }
          },
          archives: {
            include: {
              document: {
                include: {
                  emitterDirection: true,
                  recipients: {
                    include: {
                      direction: true
                    }
                  },
                  signers: {
                    orderBy: [{ signingOrder: "asc" }, { createdAt: "asc" }]
                  }
                }
              }
            }
          }
        }
      }),
      this.resolvePrincipalUser(principal),
      this.prisma.department.findMany()
    ]);

    if (!folder) {
      throw new NotFoundException("Classeur annuel introuvable.");
    }

    const mappedFolder = mapFolder(folder, departments);
    const scopedFolders = scopeFolders([mappedFolder], user, departments);

    if (!scopedFolders.length) {
      throw new NotFoundException("Classeur annuel introuvable.");
    }

    return {
      folder: mappedFolder,
      items: sortFolderDocuments(folder.archives.map((archive) => mapFolderDocument(archive)))
    };
  }

  async findActiveForArchiving(input: { year: number; bureauId: string; partnerDirectionId: string }) {
    const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);
    const folder = await this.prisma.folder.findFirst({
      where: {
        year: input.year,
        bureauId: input.bureauId,
        ownerDirectionId: ownerDirection.id,
        partnerDirectionId: input.partnerDirectionId,
        folderType: FolderType.CORRESPONDANCE
      }
    });

    if (!folder) {
      throw new ConflictException(
        "Aucun classeur actif n'existe pour cette direction partenaire, cette annee et le bureau courant."
      );
    }

    if (folder.status !== FolderStatus.ACTIVE) {
      throw new ConflictException("Le classeur correspondant est archive et ne peut plus recevoir de document.");
    }

    return folder;
  }

  async findActiveDocumentaryForArchiving(input: { year: number; bureauId: string; documentTypeId: string }) {
    const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);
    const folder = await this.prisma.folder.findFirst({
      where: {
        year: input.year,
        bureauId: input.bureauId,
        ownerDirectionId: ownerDirection.id,
        folderType: FolderType.DOCUMENTAIRE,
        documentTypes: {
          some: {
            documentTypeId: input.documentTypeId
          }
        }
      },
      include: {
        documentTypes: true
      }
    });

    if (!folder) {
      throw new ConflictException(
        "Aucun classeur documentaire actif n'existe pour ce type documentaire, cette annee et le bureau courant."
      );
    }

    if (folder.status !== FolderStatus.ACTIVE) {
      throw new ConflictException("Le classeur documentaire correspondant est archive et ne peut plus recevoir de document.");
    }

    return folder;
  }

  async createManual(
    principal: AuthenticatedPrincipal,
    input: {
      year: number;
      folderType?: FolderType;
      partnerDirectionId?: string;
      label?: string;
      description?: string;
      documentTypeIds?: string[];
    }
  ) {
    const currentUser = await this.resolvePrincipalUser(principal, false);
    const scope = resolveDepartmentScope(currentUser?.department ?? null);
    const folderType = input.folderType ?? FolderType.CORRESPONDANCE;
    const partnerDirectionId = input.partnerDirectionId?.trim() || undefined;
    const label = input.label?.trim() || undefined;
    const description = input.description?.trim() || undefined;
    const requestedDocumentTypeIds = Array.from(new Set((input.documentTypeIds ?? []).map((value) => value.trim()).filter(Boolean)));

    if (!scope.bureauId || !scope.directionId) {
      throw new BadRequestException("L'utilisateur connecte doit etre rattache a un bureau pour creer un classeur.");
    }

    if (folderType === FolderType.CORRESPONDANCE && !partnerDirectionId) {
      throw new BadRequestException("La direction partenaire est obligatoire pour un classeur de correspondance.");
    }

    if (folderType === FolderType.DOCUMENTAIRE && !label) {
      throw new BadRequestException("Le libelle est obligatoire pour un classeur documentaire.");
    }

    if (folderType === FolderType.DOCUMENTAIRE && requestedDocumentTypeIds.length === 0) {
      throw new BadRequestException("Au moins un type documentaire est obligatoire pour un classeur documentaire.");
    }

    if (folderType === FolderType.AUTRE && !label) {
      throw new BadRequestException("La designation est obligatoire pour un classeur de type autre.");
    }

    if (folderType === FolderType.CORRESPONDANCE && partnerDirectionId === scope.directionId) {
      throw new BadRequestException("La direction partenaire doit etre differente de la direction du bureau courant.");
    }

    const activeDocumentTypes =
      folderType === FolderType.DOCUMENTAIRE
        ? await this.documentTypes.resolveActiveDocumentTypes(requestedDocumentTypeIds)
        : [];

    const existing = await this.prisma.folder.findFirst({
      where: folderType === FolderType.CORRESPONDANCE
        ? {
            year: input.year,
            bureauId: scope.bureauId,
            ownerDirectionId: scope.directionId,
            folderType,
            partnerDirectionId: partnerDirectionId!
          }
        : {
            year: input.year,
            bureauId: scope.bureauId,
            ownerDirectionId: scope.directionId,
            folderType,
            label: {
              equals: label!,
              mode: "insensitive"
            }
          }
    });

    if (existing?.status === FolderStatus.ARCHIVED) {
      throw new ConflictException("Le classeur correspondant est archive. Reouvrez-le avant tout nouveau classement.");
    }

    const payload = existing
      ? await this.prisma.folder.update({
          where: { id: existing.id },
          data: {
            status: FolderStatus.ACTIVE,
            accessibleBureauIds: [scope.bureauId],
            label: folderType === FolderType.CORRESPONDANCE ? null : label,
            description: folderType === FolderType.CORRESPONDANCE ? null : description ?? null,
            documentTypes: {
              deleteMany: {},
              ...(folderType === FolderType.DOCUMENTAIRE
                ? {
                    create: activeDocumentTypes.map((documentType) => ({
                      documentTypeId: documentType.id
                    }))
                  }
                : {})
            }
          },
          include: {
            bureau: true,
            ownerDirection: true,
            partnerDirection: true,
            documentTypes: {
              include: {
                documentType: true
              }
            },
            archives: {
              select: {
                archivedAt: true,
                movementType: true
              }
            }
          }
        })
      : await this.prisma.folder.create({
          data: {
            year: input.year,
            folderType,
            label: folderType === FolderType.CORRESPONDANCE ? null : label,
            description: folderType === FolderType.CORRESPONDANCE ? null : description ?? null,
            bureauId: scope.bureauId,
            ownerDirectionId: scope.directionId,
            partnerDirectionId: folderType === FolderType.CORRESPONDANCE ? partnerDirectionId : null,
            accessibleBureauIds: [scope.bureauId],
            ...(folderType === FolderType.DOCUMENTAIRE
              ? {
                  documentTypes: {
                    create: activeDocumentTypes.map((documentType) => ({
                      documentTypeId: documentType.id
                    }))
                  }
                }
              : {})
          },
          include: {
            bureau: true,
            ownerDirection: true,
            partnerDirection: true,
            documentTypes: {
              include: {
                documentType: true
              }
            },
            archives: {
              select: {
                archivedAt: true,
                movementType: true
              }
            }
          }
        });

    return payload;
  }

  async listActiveForClassification(bureauId: string): Promise<ClassificationFolderOption[]> {
    const folders = await this.prisma.folder.findMany({
      where: {
        bureauId,
        status: FolderStatus.ACTIVE
      },
      include: {
        bureau: true,
        ownerDirection: true,
        partnerDirection: true,
        documentTypes: {
          include: {
            documentType: true
          }
        },
        archives: {
          select: {
            archivedAt: true,
            movementType: true
          }
        }
      },
      orderBy: [{ folderType: "asc" }, { label: "asc" }, { createdAt: "asc" }]
    });

    return folders.map((folder) => mapFolderToClassificationOption(folder));
  }

  async getActiveForClassification(folderId: string) {
    return this.prisma.folder.findFirst({
      where: {
        id: folderId,
        status: FolderStatus.ACTIVE
      },
      include: {
        bureau: true,
        ownerDirection: true,
        partnerDirection: true,
        documentTypes: {
          include: {
            documentType: true
          }
        },
        archives: {
          select: {
            archivedAt: true,
            movementType: true
          }
        }
      }
    });
  }

  async recommendForArchiving(input: {
    year: number;
    bureauId: string;
    partnerDirectionId?: string | null;
    documentTypeId?: string | null;
  }) {
    if (input.partnerDirectionId) {
      const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);
      return this.prisma.folder.findFirst({
        where: {
          year: input.year,
          bureauId: input.bureauId,
          ownerDirectionId: ownerDirection.id,
          partnerDirectionId: input.partnerDirectionId,
          folderType: FolderType.CORRESPONDANCE,
          status: FolderStatus.ACTIVE
        },
        include: {
          bureau: true,
          ownerDirection: true,
          partnerDirection: true,
          documentTypes: {
            include: {
              documentType: true
            }
          },
          archives: {
            select: {
              archivedAt: true,
              movementType: true
            }
          }
        }
      });
    }

    if (input.documentTypeId) {
      const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);
      return this.prisma.folder.findFirst({
        where: {
          year: input.year,
          bureauId: input.bureauId,
          ownerDirectionId: ownerDirection.id,
          folderType: FolderType.DOCUMENTAIRE,
          status: FolderStatus.ACTIVE,
          documentTypes: {
            some: {
              documentTypeId: input.documentTypeId
            }
          }
        },
        include: {
          bureau: true,
          ownerDirection: true,
          partnerDirection: true,
          documentTypes: {
            include: {
              documentType: true
            }
          },
          archives: {
            select: {
              archivedAt: true,
              movementType: true
            }
          }
        }
      });
    }

    return null;
  }

  async updateStatus(id: string, status: "ACTIVE" | "ARCHIVED") {
    const folder = await this.prisma.folder.findUnique({ where: { id } });

    if (!folder) {
      throw new NotFoundException("Classeur annuel introuvable.");
    }

    return this.prisma.folder.update({
      where: { id },
      data: {
        status: status === "ARCHIVED" ? FolderStatus.ARCHIVED : FolderStatus.ACTIVE
      }
    });
  }

  private async resolvePrincipalUser(principal: AuthenticatedPrincipal, includeRole = true) {
    const include = {
      ...(includeRole ? { role: true } : {}),
      department: {
        include: {
          parent: {
            include: {
              parent: true
            }
          }
        }
      }
    } as const;

    return (
      (await this.prisma.user.findUnique({
        where: { keycloakId: principal.sub },
        include
      })) ??
      (principal.email
        ? await this.prisma.user.findFirst({
            where: {
              email: {
                equals: principal.email.trim().toLowerCase(),
                mode: "insensitive"
              }
            },
            include
          })
        : null)
    );
  }
}

function mapFolder(folder: FolderWithRelations, departments: Department[]): ArchiveFolderListItem {
  const accessibleDepartments = folder.accessibleBureauIds
    .map((bureauId) => departments.find((department) => department.id === bureauId))
    .filter((department): department is Department => Boolean(department));
  const entryArchiveCount = folder.archives.filter((archive) => archive.movementType === "ENTREE").length;
  const outputArchiveCount = folder.archives.filter((archive) => archive.movementType === "SORTIE").length;
  const latestArchivedAt = folder.archives
    .map((archive) => archive.archivedAt.toISOString())
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  const sectionsUsed =
    entryArchiveCount > 0 && outputArchiveCount > 0
      ? "ENTREE_SORTIE"
      : entryArchiveCount > 0
        ? "ENTREE"
        : outputArchiveCount > 0
          ? "SORTIE"
          : "AUCUNE";

  return {
    id: folder.id,
    year: folder.year,
    folderType: folder.folderType,
    label: folder.label,
    description: folder.description,
    bureauId: folder.bureauId,
    accessibleBureauIds: folder.accessibleBureauIds,
    ownerDirectionId: folder.ownerDirectionId,
    directionId: folder.ownerDirectionId,
    partnerDirectionId: folder.partnerDirectionId,
    documentTypeIds: folder.documentTypes.map((item) => item.documentType.id),
    documentTypes: folder.documentTypes.map((item) => ({
      id: item.documentType.id,
      code: item.documentType.code,
      label: item.documentType.label,
      description: item.documentType.description,
      isActive: item.documentType.isActive,
      createdAt: item.documentType.createdAt.toISOString(),
      updatedAt: item.documentType.updatedAt.toISOString()
    })),
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    status: folder.status,
    ownerDirectionCode: folder.ownerDirection.code,
    ownerDirectionName: folder.ownerDirection.designation,
    partnerDirectionCode: folder.partnerDirection?.code,
    partnerDirectionName: folder.partnerDirection?.designation,
    bureauCode: folder.bureau.code,
    bureauName: folder.bureau.designation,
    accessibleBureauCodes: accessibleDepartments.map((department) => department.code),
    accessibleBureauNames: accessibleDepartments.map((department) => department.designation),
    archiveCount: folder.archives.length,
    entryArchiveCount,
    outputArchiveCount,
    sectionsUsed,
    latestArchivedAt
  };
}

function mapFolderToClassificationOption(folder: FolderWithRelations): ClassificationFolderOption {
  return {
    id: folder.id,
    folderType: folder.folderType,
    label: folder.label,
    description: folder.description,
    bureauId: folder.bureauId,
    bureauCode: folder.bureau.code,
    bureauName: folder.bureau.designation,
    ownerDirectionId: folder.ownerDirectionId,
    ownerDirectionCode: folder.ownerDirection.code,
    ownerDirectionName: folder.ownerDirection.designation,
    partnerDirectionId: folder.partnerDirectionId,
    partnerDirectionCode: folder.partnerDirection?.code,
    partnerDirectionName: folder.partnerDirection?.designation,
    documentTypeIds: folder.documentTypes.map((item) => item.documentType.id),
    documentTypeLabels: folder.documentTypes.map((item) => item.documentType.label),
    displayLabel: buildClassificationFolderLabel(folder)
  };
}

function buildClassificationFolderLabel(folder: FolderWithRelations) {
  if (folder.folderType === FolderType.CORRESPONDANCE) {
    return `Correspondance - ${folder.partnerDirection?.designation ?? folder.partnerDirection?.code ?? folder.id}`;
  }

  if (folder.folderType === FolderType.DOCUMENTAIRE) {
    return `Documentaire - ${folder.label ?? folder.id}`;
  }

  return `Autre - ${folder.label ?? folder.id}`;
}

function mapFolderDocument(archive: FolderDocumentArchiveWithRelations): ArchiveFolderDocumentListItem {
  return {
    archiveId: archive.id,
    documentId: archive.document.id,
    folderId: archive.folderId,
    movementType: archive.movementType,
    archivedAt: archive.archivedAt.toISOString(),
    reference: archive.document.reference,
    referenceNumber: archive.document.referenceNumber,
    title: archive.document.title,
    subject: archive.document.subject ?? undefined,
    createdAt: archive.document.createdAt.toISOString(),
    emitterDirectionId: archive.document.emitterDirection.id,
    emitterDirectionCode: archive.document.emitterDirection.code,
    emitterDirectionName: archive.document.emitterDirection.designation,
    receiverDirectionNames: archive.document.recipients
      .filter((recipient) => recipient.kind === "RECEIVER")
      .map((recipient) => recipient.direction.designation),
    copyDirectionNames: archive.document.recipients
      .filter((recipient) => recipient.kind === "COPY")
      .map((recipient) => recipient.direction.designation),
    signers: archive.document.signers.map((signer) => ({
      fullName: signer.fullName,
      functionTitle: signer.functionTitle ?? undefined,
      signingOrder: signer.signingOrder ?? undefined
    }))
  };
}

function scopeFolders(
  folders: ArchiveFolderListItem[],
  user: (User & { role: { code: string }; department: DepartmentNode }) | null,
  departments: Department[]
) {
  const currentUser = user ? toAuthenticatedUser(user) : null;

  if (!currentUser || currentUser.role === "ADMIN" || currentUser.role === "DIRECTEUR_GENERAL" || currentUser.role === "AUDITEUR") {
    return folders;
  }

  if (currentUser.role === "DIRECTEUR") {
    return folders.filter((folder) => folder.ownerDirectionId === currentUser.directionId);
  }

  if (currentUser.role === "MANAGER") {
    const serviceBureauIds = new Set(
      departments
        .filter((department) => department.type === "BUREAU")
        .filter((bureau) => bureau.serviceId === currentUser.serviceId)
        .map((bureau) => bureau.id)
    );
    return folders.filter((folder) => serviceBureauIds.has(folder.bureauId));
  }

  if (currentUser.role === "AGENT") {
    return folders.filter((folder) => folder.bureauId === currentUser.bureauId);
  }

  return folders.filter((folder) => folder.ownerDirectionId === currentUser.directionId);
}

function sortFolderDocuments(items: ArchiveFolderDocumentListItem[]) {
  return [...items].sort((left, right) => {
    if (left.movementType !== right.movementType) {
      return left.movementType === "SORTIE" ? -1 : 1;
    }

    if (left.movementType === "SORTIE") {
      return right.referenceNumber - left.referenceNumber;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

function toAuthenticatedUser(user: User & { role: { code: string }; department: DepartmentNode }) {
  const scope = resolveDepartmentScope(user.department);

  return {
    id: user.id,
    email: user.email,
    displayName: [user.nom, user.prenom].filter(Boolean).join(" ").trim() || user.email,
    role: user.role.code,
    directionId: scope.directionId,
    serviceId: scope.serviceId,
    bureauId: scope.bureauId
  };
}

type DepartmentNode = Parameters<typeof resolveDepartmentScope>[0];

function applyFolderFilters(folders: ArchiveFolderListItem[], query: ListFoldersQueryDto) {
  const searchTerm = query.q?.trim().toLowerCase() ?? "";
  const year = query.year;
  const directionId = query.directionId;
  const partnerDirectionId = query.partnerDirectionId;
  const section = query.section;
  const status = query.status;
  const period = resolveDateRange(query.periodPreset, query.dateFrom, query.dateTo);
  const dateField = query.dateField ?? "updatedAt";

  return folders.filter((folder) => {
    return (
      (!searchTerm ||
        folder.id.toLowerCase().includes(searchTerm) ||
        (folder.ownerDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        (folder.partnerDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        (folder.bureauName ?? "").toLowerCase().includes(searchTerm) ||
        (folder.label ?? "").toLowerCase().includes(searchTerm) ||
        folder.documentTypes?.some((item) =>
          [item.code, item.label, item.description ?? ""].join(" ").toLowerCase().includes(searchTerm)
        )) &&
      (!year || folder.year === year) &&
      (!directionId || folder.ownerDirectionId === directionId) &&
      (!partnerDirectionId || folder.partnerDirectionId === partnerDirectionId) &&
      (!section ||
        (section === "ENTREE" && folder.entryArchiveCount > 0) ||
        (section === "SORTIE" && folder.outputArchiveCount > 0)) &&
      (!status || folder.status === status) &&
      matchesDateRange(folder[dateField], period)
    );
  });
}

function paginate<T>(items: T[], query: ListFoldersQueryDto): PaginatedResult<T> {
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

  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDate = now.getUTCDate();

  if (periodPreset === "today") {
    return {
      start: new Date(Date.UTC(currentYear, currentMonth, currentDate, 0, 0, 0, 0)),
      end: new Date(Date.UTC(currentYear, currentMonth, currentDate, 23, 59, 59, 999))
    };
  }

  if (periodPreset === "week") {
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(Date.UTC(currentYear, currentMonth, currentDate - diff, 0, 0, 0, 0));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
    return { start, end };
  }

  if (periodPreset === "month") {
    return {
      start: new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0)),
      end: new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999))
    };
  }

  if (periodPreset === "quarter") {
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    return {
      start: new Date(Date.UTC(currentYear, quarterStartMonth, 1, 0, 0, 0, 0)),
      end: new Date(Date.UTC(currentYear, quarterStartMonth + 3, 0, 23, 59, 59, 999))
    };
  }

  if (periodPreset === "year") {
    return {
      start: new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0)),
      end: new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999))
    };
  }

  if (periodPreset === "previousYear") {
    return {
      start: new Date(Date.UTC(currentYear - 1, 0, 1, 0, 0, 0, 0)),
      end: new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999))
    };
  }

  return null;
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
