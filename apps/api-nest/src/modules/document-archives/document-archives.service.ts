import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FolderStatus, MovementType, type Department, type DocumentArchive, type User } from "@sigeda/database";
import type {
  ClassificationFolderOption,
  DocumentClassificationProposal,
  DocumentArchiveDetails,
  DocumentArchiveListItem,
  PaginatedResult
} from "@sigeda/shared/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { DepartmentsService } from "../departments/departments.service.js";
import { PhysicalArchivesService } from "../physical-archives/physical-archives.service.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import { recipientMatchesScope } from "../../shared/document-recipient-targets.js";
import type { ListDocumentArchivesQueryDto } from "./dto/list-document-archives-query.dto.js";

type DepartmentNode = Parameters<typeof resolveDepartmentScope>[0];

type ScopedUser = User & {
  role: { code: string; name: string };
  department: DepartmentNode;
};

type ArchiveWithRelations = DocumentArchive & {
    document: {
    id: string;
    reference: string;
    referenceNumber: number;
    year: number;
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
      annotations: Array<{
        sourceDirectionId: string;
        createdAt: Date;
      }>;
    };
  folder: {
    id: string;
    status: "ACTIVE" | "ARCHIVED";
    ownerDirectionId: string;
    partnerDirectionId: string | null;
    ownerDirection: Department;
  };
  bureau: Department;
};

type RecommendationFolderRecord = {
  id: string;
  folderType: "CORRESPONDANCE" | "DOCUMENTAIRE" | "AUTRE";
  label: string | null;
  description: string | null;
  bureauId: string;
  ownerDirectionId: string;
  partnerDirectionId: string | null;
  bureau: Department;
  ownerDirection: Department;
  partnerDirection: Department | null;
  documentTypes: Array<{
    documentType: {
      id: string;
      label: string;
    };
  }>;
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
    private readonly departments: DepartmentsService,
    private readonly physicalArchives: PhysicalArchivesService
  ) {}

  async list(query: ListDocumentArchivesQueryDto, principal: AuthenticatedPrincipal): Promise<PaginatedResult<DocumentArchiveListItem>> {
    const [archives, user] = await Promise.all([this.loadArchives(), this.resolvePrincipalUser(principal)]);

    const scopedArchives = archives.filter((archive) => canAccessArchive(archive, user));
    const mapped = decorateArchiveFlags(
      scopedArchives.map((archive) => mapArchive(archive, user)),
      user,
      buildArchivedDocumentIdsForDirection(archives, user)
    );
    const filters = parseArchiveQuery(query);
    const filtered = sortArchives(applyArchiveFilters(mapped, query), filters.sortBy, filters.sortDir);

    return paginate(filtered, query);
  }

  async get(id: string, principal: AuthenticatedPrincipal): Promise<DocumentArchiveDetails> {
    const [archive, user] = await Promise.all([
      this.loadArchiveById(id),
      this.resolvePrincipalUser(principal)
    ]);

    if (!archive) {
      throw new NotFoundException("Archive documentaire introuvable.");
    }

    if (!canAccessArchive(archive, user)) {
      throw new NotFoundException("Archive documentaire introuvable.");
    }

    const siblingArchives = await this.prisma.documentArchive.findMany({
      where: {
        documentId: archive.documentId
      },
      include: archiveInclude
    });

    const mappedArchive = decorateArchiveFlags(
      [mapArchive(archive, user)],
      user,
      buildArchivedDocumentIdsForDirection(siblingArchives, user)
    )[0];

    return {
      ...mappedArchive,
      bureauCode: archive.bureau.code,
      bureauName: archive.bureau.designation,
      folderLabel: buildFolderLabel(archive.folder.ownerDirection.code, archive.folder.partnerDirectionId, archive.folder.id)
    };
  }

  async classify(id: string, principal: AuthenticatedPrincipal) {
    const [archive, user] = await Promise.all([this.loadArchiveById(id), this.resolvePrincipalUser(principal)]);

    if (!archive) {
      throw new NotFoundException("Archive documentaire introuvable.");
    }

    if (!canAccessArchive(archive, user)) {
      throw new ForbiddenException("Vous n'etes pas autorise a classer ce document.");
    }

    const scope = resolveDepartmentScope(user.department);
    const currentDirectionId = scope.directionId;

    if (!currentDirectionId) {
      throw new BadRequestException("La direction du compte connecte est introuvable.");
    }

    if (!scope.bureauId) {
      throw new BadRequestException(
        "Aucun bureau n'est rattache a votre compte. Le classement automatique ne peut pas etre determine."
      );
    }

    if (currentDirectionId === archive.document.emitterDirectionId) {
      throw new BadRequestException(
        "Cette archive emettrice est deja geree par le classement automatique initial."
      );
    }

    const targetPartnerDirectionId = archive.document.emitterDirectionId;
    const movementType: MovementType = MovementType.ENTREE;

    try {
      const targetFolder = await this.folders.findActiveForArchiving({
        year: archive.document.year,
        bureauId: scope.bureauId,
        partnerDirectionId: targetPartnerDirectionId
      });

      const classifiedArchive = await this.prisma.documentArchive.upsert({
        where: {
          documentId_bureauId_folderId_movementType: {
            documentId: archive.documentId,
            bureauId: scope.bureauId,
            folderId: targetFolder.id,
            movementType
          }
        },
        update: {
          archivedById: user.id
        },
        create: {
          documentId: archive.documentId,
          bureauId: scope.bureauId,
          folderId: targetFolder.id,
          movementType,
          archivedById: user.id
        }
      });

      await this.physicalArchives.ensureAutomaticForDocumentArchives({
        documentId: archive.documentId,
        emitterDirectionId: archive.document.emitterDirectionId,
        year: archive.document.year,
        documentArchives: [
          {
            id: classifiedArchive.id,
            documentId: classifiedArchive.documentId,
            folderId: classifiedArchive.folderId,
            movementType: classifiedArchive.movementType
          }
        ]
      });

      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CLASSIFY_DOCUMENT_ARCHIVE",
          entityType: "DOCUMENT_ARCHIVE",
          entityId: classifiedArchive.id,
          metadata: {
            description: `Archivage automatique du document ${archive.document.reference} dans le classeur ${targetFolder.id}`,
            documentId: archive.documentId,
            documentReference: archive.document.reference,
            sourceArchiveId: archive.id,
            targetBureauId: scope.bureauId,
            targetFolderId: targetFolder.id,
            partnerDirectionId: targetPartnerDirectionId,
            archiveMode: "AUTOMATIC",
            userName: buildUserName(user),
            email: user.email
          }
        }
      });

      return this.get(classifiedArchive.id, principal);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(
          "Aucun classeur actif correspondant n'a ete trouve dans votre bureau. Veuillez contacter votre responsable ou creer le classeur approprie."
        );
      }

      throw error;
    }
  }

  async classifyDocument(
    documentId: string,
    principal: AuthenticatedPrincipal,
    input?: {
      bureauId?: string;
      folderId?: string;
    }
  ) {
    const context = await this.resolveDocumentClassificationContext(documentId, principal, input?.bureauId);
    const recommendation = await this.buildClassificationProposal(context);

    try {
      const archives = [] as DocumentArchive[];
      const selectedFolderId = input?.folderId?.trim();

      if (selectedFolderId) {
        const selectedFolder = await this.folders.getActiveForClassification(selectedFolderId);

        if (!selectedFolder) {
          throw new ConflictException("Le classeur selectionne est introuvable ou inactif.");
        }

        if (selectedFolder.bureauId !== context.targetBureauId) {
          throw new ForbiddenException("Le classeur selectionne n'appartient pas au bureau de classement choisi.");
        }

        const classifiedArchive = await this.prisma.documentArchive.upsert({
          where: {
            documentId_bureauId_folderId_movementType: {
              documentId: context.document.id,
              bureauId: context.targetBureauId,
              folderId: selectedFolder.id,
              movementType: context.movementType
            }
          },
          update: {
            archivedById: context.user.id
          },
          create: {
            documentId: context.document.id,
            bureauId: context.targetBureauId,
            folderId: selectedFolder.id,
            movementType: context.movementType,
            archivedById: context.user.id
          }
        });

        archives.push(classifiedArchive);

        await this.prisma.auditLog.create({
          data: {
            userId: context.user.id,
            action: "CLASSIFY_DOCUMENT_ARCHIVE",
            entityType: "DOCUMENT_ARCHIVE",
            entityId: classifiedArchive.id,
            metadata: {
              description: `Classement manuel du document ${context.document.reference} dans le classeur ${selectedFolder.id}`,
              documentId: context.document.id,
              documentReference: context.document.reference,
              targetBureauId: context.targetBureauId,
              targetFolderId: selectedFolder.id,
              movementType: context.movementType,
              archiveMode:
                recommendation.recommendedFolder?.id === selectedFolder.id ? "RECOMMENDED_ACCEPTED" : "MANUAL_OVERRIDE",
              recommendedFolderId: recommendation.recommendedFolder?.id ?? null,
              userName: buildUserName(context.user),
              email: context.user.email
            }
          }
        });

        await this.physicalArchives.ensureAutomaticForDocumentArchives({
          documentId: context.document.id,
          emitterDirectionId: context.document.emitterDirectionId,
          year: context.document.year,
          documentArchives: archives.map((archive) => ({
            id: archive.id,
            documentId: archive.documentId,
            folderId: archive.folderId,
            movementType: archive.movementType
          }))
        });

        return archives;
      }

      if (!context.partnerDirectionIds.length) {
        if (!recommendation.recommendedFolder) {
          throw new ConflictException("Aucun classeur recommande n'a ete trouve pour ce document.");
        }

        const classifiedArchive = await this.prisma.documentArchive.upsert({
          where: {
            documentId_bureauId_folderId_movementType: {
              documentId: context.document.id,
              bureauId: context.targetBureauId,
              folderId: recommendation.recommendedFolder.id,
              movementType: context.movementType
            }
          },
          update: {
            archivedById: context.user.id
          },
          create: {
            documentId: context.document.id,
            bureauId: context.targetBureauId,
            folderId: recommendation.recommendedFolder.id,
            movementType: context.movementType,
            archivedById: context.user.id
          }
        });

        archives.push(classifiedArchive);

        await this.prisma.auditLog.create({
          data: {
            userId: context.user.id,
            action: "CLASSIFY_DOCUMENT_ARCHIVE",
            entityType: "DOCUMENT_ARCHIVE",
            entityId: classifiedArchive.id,
            metadata: {
              description: `Classement du document ${context.document.reference} dans le classeur ${recommendation.recommendedFolder.id}`,
              documentId: context.document.id,
              documentReference: context.document.reference,
              targetBureauId: context.targetBureauId,
              targetFolderId: recommendation.recommendedFolder.id,
              movementType: context.movementType,
              archiveMode: "RECOMMENDED_DOCUMENTARY",
              recommendedFolderId: recommendation.recommendedFolder.id,
              userName: buildUserName(context.user),
              email: context.user.email
            }
          }
        });

        await this.physicalArchives.ensureAutomaticForDocumentArchives({
          documentId: context.document.id,
          emitterDirectionId: context.document.emitterDirectionId,
          year: context.document.year,
          documentArchives: archives.map((archive) => ({
            id: archive.id,
            documentId: archive.documentId,
            folderId: archive.folderId,
            movementType: archive.movementType
          }))
        });

        return archives;
      }

      for (const partnerDirectionId of context.partnerDirectionIds) {
        const targetFolder = await this.folders.findActiveForArchiving({
          year: context.document.year,
          bureauId: context.targetBureauId,
          partnerDirectionId
        });

        const classifiedArchive = await this.prisma.documentArchive.upsert({
          where: {
            documentId_bureauId_folderId_movementType: {
              documentId: context.document.id,
              bureauId: context.targetBureauId,
              folderId: targetFolder.id,
              movementType: context.movementType
            }
          },
          update: {
            archivedById: context.user.id
          },
          create: {
            documentId: context.document.id,
            bureauId: context.targetBureauId,
            folderId: targetFolder.id,
            movementType: context.movementType,
            archivedById: context.user.id
          }
        });

        archives.push(classifiedArchive);

        await this.prisma.auditLog.create({
          data: {
            userId: context.user.id,
            action: "CLASSIFY_DOCUMENT_ARCHIVE",
            entityType: "DOCUMENT_ARCHIVE",
            entityId: classifiedArchive.id,
            metadata: {
              description: `Classement du document ${context.document.reference} dans le classeur ${targetFolder.id}`,
              documentId: context.document.id,
              documentReference: context.document.reference,
              targetBureauId: context.targetBureauId,
              targetFolderId: targetFolder.id,
              partnerDirectionId,
              movementType: context.movementType,
              archiveMode: "DOCUMENT_CLASSIFICATION",
              recommendedFolderId: recommendation.recommendedFolder?.id ?? null,
              userName: buildUserName(context.user),
              email: context.user.email
            }
          }
        });
      }

      await this.physicalArchives.ensureAutomaticForDocumentArchives({
        documentId: context.document.id,
        emitterDirectionId: context.document.emitterDirectionId,
        year: context.document.year,
        documentArchives: archives.map((archive) => ({
          id: archive.id,
          documentId: archive.documentId,
          folderId: archive.folderId,
          movementType: archive.movementType
        }))
      });

      return archives;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(
          "Aucun classeur actif correspondant n'a ete trouve dans votre bureau. Veuillez contacter votre responsable ou creer le classeur approprie."
        );
      }

      throw error;
    }
  }

  async classificationProposal(
    documentId: string,
    principal: AuthenticatedPrincipal,
    input?: {
      bureauId?: string;
    }
  ): Promise<DocumentClassificationProposal> {
    const context = await this.resolveDocumentClassificationContext(documentId, principal, input?.bureauId);
    return this.buildClassificationProposal(context);
  }

  async creationClassificationProposal(input: {
    year: number;
    bureauId: string;
    emitterDirectionId: string;
    receiverDirectionIds: string[];
    copyDirectionIds: string[];
    documentTypeId?: string | null;
  }): Promise<DocumentClassificationProposal> {
    const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);
    const isEmitterDirection = ownerDirection.id === input.emitterDirectionId;
    const movementType: MovementType = isEmitterDirection ? MovementType.SORTIE : MovementType.ENTREE;
    const partnerDirectionIds = resolvePartnerDirectionIdsForClassification({
      emitterDirectionId: input.emitterDirectionId,
      receiverDirectionIds: input.receiverDirectionIds,
      copyDirectionIds: input.copyDirectionIds,
      isEmitterDirection
    });

    return this.buildClassificationProposal({
      document: {
        id: "__draft__",
        year: input.year,
        documentTypeId: input.documentTypeId ?? null,
        emitterDirectionId: input.emitterDirectionId
      },
      targetBureauId: input.bureauId,
      movementType,
      partnerDirectionIds
    });
  }

  private async resolveDocumentClassificationContext(
    documentId: string,
    principal: AuthenticatedPrincipal,
    requestedBureauId?: string
  ) {
    const [document, user] = await Promise.all([
      this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          emitterDirection: true,
          recipients: {
            include: {
              direction: true,
              targetDepartment: true,
              targetUser: true
            }
          }
        }
      }),
      this.resolvePrincipalUser(principal)
    ]);

    if (!document) {
      throw new NotFoundException("Document introuvable.");
    }

    const scope = resolveDepartmentScope(user.department);
    const currentDirectionId = scope.directionId;

    if (!currentDirectionId) {
      throw new BadRequestException("La direction du compte connecte est introuvable.");
    }

    if (!scope.bureauId) {
      throw new BadRequestException("Aucun bureau n'est rattache a votre compte. Le classement automatique ne peut pas etre determine.");
    }

    const receiverDirectionIds = document.recipients.filter((recipient) => recipient.kind === "RECEIVER").map((recipient) => recipient.directionId);
    const copyDirectionIds = document.recipients.filter((recipient) => recipient.kind === "COPY").map((recipient) => recipient.directionId);

    const isEmitterDirection = currentDirectionId === document.emitterDirectionId;
    const isRecipientDirection = document.recipients.some((recipient) =>
      recipientMatchesScope(recipient, {
        id: user.id,
        directionId: scope.directionId,
        serviceId: scope.serviceId,
        bureauId: scope.bureauId
      })
    );

    if (!isEmitterDirection && !isRecipientDirection) {
      throw new ForbiddenException("Vous n'etes pas autorise a classer ce document depuis votre direction.");
    }

    const movementType: MovementType = isEmitterDirection ? MovementType.SORTIE : MovementType.ENTREE;
    const partnerDirectionIds = resolvePartnerDirectionIdsForClassification({
      emitterDirectionId: document.emitterDirectionId,
      receiverDirectionIds,
      copyDirectionIds,
      isEmitterDirection
    });
    const targetBureauId = await this.resolveClassificationBureauId(user, requestedBureauId);

    return {
      document,
      user,
      targetBureauId,
      movementType,
      partnerDirectionIds
    };
  }

  private async buildClassificationProposal(input: {
    document: {
      id: string;
      year: number;
      documentTypeId: string | null;
      emitterDirectionId: string;
    };
    targetBureauId: string;
    movementType: MovementType;
    partnerDirectionIds: string[];
  }): Promise<DocumentClassificationProposal> {
    const activeFolders = await this.folders.listActiveForClassification(input.targetBureauId);
    const recommendedFolderRecord =
      input.partnerDirectionIds[0]
        ? await this.folders.recommendForArchiving({
            year: input.document.year,
            bureauId: input.targetBureauId,
            partnerDirectionId: input.partnerDirectionIds[0]
          })
        : await this.folders.recommendForArchiving({
            year: input.document.year,
            bureauId: input.targetBureauId,
            documentTypeId: input.document.documentTypeId
          });
    const recommendedFolder = recommendedFolderRecord
      ? mapFolderOption(recommendedFolderRecord as RecommendationFolderRecord)
      : null;

    return {
      documentId: input.document.id,
      bureauId: input.targetBureauId,
      movementType: input.movementType,
      section: input.movementType,
      recommendedFolder,
      recommendedReason: buildClassificationReason(input.partnerDirectionIds, recommendedFolder),
      availableFolders: activeFolders,
      canOverride: activeFolders.length > 0
    };
  }

  private async resolveClassificationBureauId(user: ScopedUser, requestedBureauId?: string) {
    const scope = resolveDepartmentScope(user.department);

    if (!scope.directionId || !scope.bureauId) {
      throw new BadRequestException("Aucun bureau n'est rattache a votre compte. Le classement automatique ne peut pas etre determine.");
    }

    const targetBureauId = requestedBureauId?.trim() || scope.bureauId;

    if (targetBureauId === scope.bureauId) {
      return targetBureauId;
    }

    const bureau = await this.prisma.department.findUnique({
      where: { id: targetBureauId },
      select: {
        id: true,
        type: true,
        directionId: true,
        serviceId: true
      }
    });

    if (!bureau || bureau.type !== "BUREAU") {
      throw new BadRequestException("Le bureau de classement selectionne est invalide.");
    }

    if (bureau.directionId !== scope.directionId) {
      throw new ForbiddenException("Vous ne pouvez pas classer un document dans un bureau hors de votre direction.");
    }

    if (user.role.code === "AGENT" && bureau.id !== scope.bureauId) {
      throw new ForbiddenException("Un agent ne peut classer un document que dans son propre bureau.");
    }

    return bureau.id;
  }

  async syncForCreatedDocument(input: {
    documentId: string;
    year: number;
    bureauId: string;
    emitterDirectionId: string;
    receiverDirectionIds: string[];
    copyDirectionIds: string[];
    documentTypeId?: string | null;
    selectedFolderId?: string;
    archivedById: string;
  }) {
    const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);
    const partners = resolvePartnerDirectionIdsForClassification({
      emitterDirectionId: input.emitterDirectionId,
      receiverDirectionIds: input.receiverDirectionIds,
      copyDirectionIds: input.copyDirectionIds,
      isEmitterDirection: ownerDirection.id === input.emitterDirectionId
    });

    if (ownerDirection.id === input.emitterDirectionId) {
      return this.createArchives(input, partners, "SORTIE");
    }

    return this.createArchives(input, partners, "ENTREE");
  }

  private async createArchives(
    input: {
      documentId: string;
      year: number;
      bureauId: string;
      documentTypeId?: string | null;
      selectedFolderId?: string;
      archivedById: string;
    },
    partnerDirectionIds: string[],
    movementType: MovementType
  ) {
    const archives = [];

    const selectedFolderId = input.selectedFolderId?.trim();

    if (selectedFolderId) {
      const selectedFolder = await this.folders.getActiveForClassification(selectedFolderId);

      if (!selectedFolder) {
        throw new ConflictException("Le classeur selectionne est introuvable ou inactif.");
      }

      if (selectedFolder.bureauId !== input.bureauId) {
        throw new ForbiddenException("Le classeur selectionne n'appartient pas au bureau de classement propose.");
      }

      archives.push(
        await this.prisma.documentArchive.upsert({
          where: {
            documentId_bureauId_folderId_movementType: {
              documentId: input.documentId,
              bureauId: input.bureauId,
              folderId: selectedFolder.id,
              movementType
            }
          },
          update: {},
          create: {
            documentId: input.documentId,
            bureauId: input.bureauId,
            folderId: selectedFolder.id,
            movementType,
            archivedById: input.archivedById
          }
        })
      );

      return archives;
    }

    if (!partnerDirectionIds.length && input.documentTypeId) {
      const folder = await this.folders.findActiveDocumentaryForArchiving({
        year: input.year,
        bureauId: input.bureauId,
        documentTypeId: input.documentTypeId
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

      return archives;
    }

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

  private async loadArchives() {
    return this.prisma.documentArchive.findMany({
      include: archiveInclude,
      orderBy: [{ document: { updatedAt: "desc" } }, { archivedAt: "desc" }]
    }) as Promise<ArchiveWithRelations[]>;
  }

  private async loadArchiveById(id: string) {
    return (this.prisma.documentArchive.findUnique({
      where: { id },
      include: archiveInclude
    }) as Promise<ArchiveWithRelations | null>);
  }

  private async resolvePrincipalUser(principal: AuthenticatedPrincipal) {
    const include = {
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
    } as const;

    const user =
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
        : null);

    if (!user) {
      throw new NotFoundException("Utilisateur authentifie introuvable.");
    }

    return user as ScopedUser;
  }
}

const archiveInclude = {
  document: {
    include: {
      emitterDirection: true,
      recipients: {
        include: {
          direction: true
        }
      },
      annotations: {
        select: {
          sourceDirectionId: true,
          createdAt: true
        }
      }
    }
  },
  folder: {
    include: {
      ownerDirection: true
    }
  },
  bureau: true
} as const;

function resolvePartnerDirectionIdsForClassification(input: {
  emitterDirectionId: string;
  receiverDirectionIds: string[];
  copyDirectionIds: string[];
  isEmitterDirection: boolean;
}) {
  if (input.isEmitterDirection) {
    // Cote direction emettrice, les archives documentaires SORTIE couvrent
    // les directions destinataires et les directions en copie.
    return Array.from(new Set([...input.receiverDirectionIds, ...input.copyDirectionIds].filter(Boolean)));
  }

  // Cote direction receptionnaire (destinataire principal ou copie),
  // le classement manuel cree exclusivement une archive ENTREE
  // rattachee a la direction emettrice.
  return input.emitterDirectionId ? [input.emitterDirectionId] : [];
}

function mapArchive(archive: ArchiveWithRelations, user: ScopedUser | null): DocumentArchiveListItem {
  const partnerDirections =
    archive.movementType === "SORTIE"
      ? archive.document.recipients
          .filter((recipient) => recipient.kind === "RECEIVER" || recipient.kind === "COPY")
          .map((recipient) => recipient.direction)
      : [archive.document.emitterDirection];
  const visibleAnnotations = filterVisibleArchiveAnnotations(archive.document.annotations, archive.document.emitterDirectionId, user);

  return {
    id: archive.id,
    year: archive.document.year,
    documentId: archive.documentId,
    ownerDirectionId: archive.folder.ownerDirectionId,
    directionId: archive.folder.ownerDirectionId,
    serviceId: archive.bureau.serviceId ?? undefined,
    bureauId: archive.bureauId,
    folderId: archive.folderId,
    movementType: archive.movementType,
    archivedAt: archive.archivedAt.toISOString(),
    updatedAt: archive.document.updatedAt.toISOString(),
    archivedBy: archive.archivedById,
    archiveFolderId: archive.folderId,
    annotationCount: visibleAnnotations.length,
    documentReference: archive.document.reference,
    documentTitle: archive.document.title || archive.document.subject || archive.document.reference,
    referenceNumber: archive.document.referenceNumber,
    emitterDirectionCode: archive.document.emitterDirection.code,
    emitterDirectionName: archive.document.emitterDirection.designation,
    currentDirectionCode: archive.folder.ownerDirection.code,
    currentDirectionName: archive.folder.ownerDirection.designation,
    bureauCode: archive.bureau.code,
    bureauName: archive.bureau.designation,
    folderStatus: archive.folder.status,
    partnerDirectionIds: partnerDirections.map((direction) => direction.id),
    partnerDirectionCodes: partnerDirections.map((direction) => direction.code),
    partnerDirectionNames: partnerDirections.map((direction) => direction.designation),
    documentCreatedAt: archive.document.createdAt.toISOString(),
    documentStatus: archive.document.status as DocumentArchiveListItem["documentStatus"],
    confidentialityLevel: archive.document.confidentiality as DocumentArchiveListItem["confidentialityLevel"],
    hasAnnotations: visibleAnnotations.length > 0,
    annotationDirectionIds: Array.from(new Set(visibleAnnotations.map((annotation) => annotation.sourceDirectionId))),
    latestAnnotationAt: visibleAnnotations[visibleAnnotations.length - 1]?.createdAt.toISOString()
  };
}

function filterVisibleArchiveAnnotations(
  annotations: Array<{ sourceDirectionId: string; createdAt: Date }>,
  emitterDirectionId: string,
  user: ScopedUser | null
) {
  if (!user || ["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(user.role.code)) {
    return annotations;
  }

  const scope = resolveDepartmentScope(user.department);

  if (!scope.directionId) {
    return [];
  }

  if (scope.directionId === emitterDirectionId) {
    return annotations;
  }

  return annotations.filter((annotation) => annotation.sourceDirectionId === scope.directionId);
}

function decorateArchiveFlags(
  archives: DocumentArchiveListItem[],
  user: ScopedUser | null,
  directionArchivedDocumentIds?: Set<string>
) {
  const scope = user ? resolveDepartmentScope(user.department) : null;
  const currentDirectionId = scope?.directionId ?? null;
  const currentBureauId = scope?.bureauId ?? null;

  if (!currentDirectionId || !currentBureauId) {
    return archives.map((archive) => ({
      ...archive,
      canArchive: false
    }));
  }

  const archivedDocumentIds =
    directionArchivedDocumentIds ??
    new Set(
      archives
        .filter((archive) => archive.ownerDirectionId === currentDirectionId && Boolean(archive.folderId))
        .map((archive) => archive.documentId)
    );

  return archives.map((archive) => ({
    ...archive,
    canArchive: archive.ownerDirectionId !== currentDirectionId && !archivedDocumentIds.has(archive.documentId)
  }));
}

function buildArchivedDocumentIdsForDirection(archives: ArchiveWithRelations[], user: ScopedUser | null) {
  const scope = user ? resolveDepartmentScope(user.department) : null;
  const currentDirectionId = scope?.directionId ?? null;

  if (!currentDirectionId) {
    return new Set<string>();
  }

  return new Set(
    archives
      .filter((archive) => archive.folder.ownerDirectionId === currentDirectionId && Boolean(archive.folderId))
      .map((archive) => archive.documentId)
  );
}

function canAccessArchive(archive: ArchiveWithRelations, user: ScopedUser | null) {
  if (!user || ["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(user.role.code)) {
    return true;
  }

  const scope = resolveDepartmentScope(user.department);

  if (!scope.directionId) {
    return false;
  }

  if (user.role.code === "DIRECTEUR") {
    return archive.bureau.directionId === scope.directionId;
  }

  if (user.role.code === "MANAGER") {
    return Boolean(scope.serviceId && archive.bureau.serviceId === scope.serviceId);
  }

  if (user.role.code === "AGENT") {
    return Boolean(scope.bureauId && archive.bureauId === scope.bureauId);
  }

  return archive.bureau.directionId === scope.directionId;
}

function buildUserName(user: ScopedUser) {
  return [user.nom, user.prenom].filter(Boolean).join(" ").trim() || user.email;
}

function buildFolderLabel(ownerDirectionCode: string | undefined, partnerDirectionId: string | null | undefined, folderId: string) {
  return [ownerDirectionCode, partnerDirectionId, folderId].filter(Boolean).join(" / ");
}

function mapFolderOption(folder: RecommendationFolderRecord): ClassificationFolderOption {
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
    displayLabel: buildRecommendationFolderLabel(folder)
  };
}

function buildRecommendationFolderLabel(folder: RecommendationFolderRecord) {
  if (folder.folderType === "CORRESPONDANCE") {
    return `Correspondance - ${folder.partnerDirection?.designation ?? folder.partnerDirection?.code ?? folder.id}`;
  }

  if (folder.folderType === "DOCUMENTAIRE") {
    return `Documentaire - ${folder.label ?? folder.id}`;
  }

  return `Autre - ${folder.label ?? folder.id}`;
}

function buildClassificationReason(
  partnerDirectionIds: string[],
  recommendedFolder: ClassificationFolderOption | null
) {
  if (recommendedFolder?.folderType === "CORRESPONDANCE" && partnerDirectionIds.length > 0) {
    return "Le document comporte une direction partenaire. Un classeur de correspondance a donc ete propose en priorite.";
  }

  if (recommendedFolder?.folderType === "DOCUMENTAIRE") {
    return "Aucune direction partenaire exploitable n'a ete retenue. Un classeur documentaire compatible a donc ete propose.";
  }

  if (recommendedFolder?.folderType === "AUTRE") {
    return "Aucun classeur standard n'etait prioritaire. Le moteur propose un classeur libre actif dans votre bureau.";
  }

  if (partnerDirectionIds.length > 0) {
    return "Le moteur n'a trouve aucun classeur de correspondance actif correspondant. Vous pouvez choisir un autre classeur de votre perimetre.";
  }

  return "Le moteur n'a trouve aucun classeur recommande. Vous pouvez choisir un autre classeur actif de votre perimetre.";
}

function applyArchiveFilters(archives: DocumentArchiveListItem[], query: ListDocumentArchivesQueryDto) {
  const searchTerm = query.q?.trim().toLowerCase() ?? "";
  const year = query.year;
  const directionId = query.directionId;
  const serviceId = query.serviceId;
  const bureauId = query.bureauId;
  const partnerDirectionId = query.partnerDirectionId;
  const annotationDirectionId = query.annotationDirectionId;
  const annotationState = query.annotationState;
  const section = query.section;
  const period = resolveDateRange(query.periodPreset, query.dateFrom, query.dateTo);
  const annotationPeriod = resolveDateRange("custom", query.annotationDateFrom, query.annotationDateTo);
  const dateField = query.dateField ?? "updatedAt";

  return archives.filter((archive) => {
    return (
      (!searchTerm ||
        archive.documentReference.toLowerCase().includes(searchTerm) ||
        archive.documentTitle.toLowerCase().includes(searchTerm) ||
        (archive.currentDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        (archive.bureauName ?? "").toLowerCase().includes(searchTerm) ||
        archive.partnerDirectionNames.some((value) => value.toLowerCase().includes(searchTerm))) &&
      (!year || archive.year === year) &&
      (!directionId || archive.ownerDirectionId === directionId || archive.directionId === directionId) &&
      (!serviceId || archive.serviceId === serviceId) &&
      (!bureauId || archive.bureauId === bureauId) &&
      (!partnerDirectionId || archive.partnerDirectionIds.includes(partnerDirectionId)) &&
      (!annotationDirectionId || archive.annotationDirectionIds?.includes(annotationDirectionId)) &&
      (!annotationState || (annotationState === "with" ? Boolean(archive.hasAnnotations) : !archive.hasAnnotations)) &&
      (!section || archive.movementType === section) &&
      matchesDateRange(dateField === "archivedAt" ? archive.archivedAt : archive.updatedAt, period) &&
      (!annotationPeriod || (Boolean(archive.latestAnnotationAt) && matchesDateRange(archive.latestAnnotationAt, annotationPeriod)))
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
