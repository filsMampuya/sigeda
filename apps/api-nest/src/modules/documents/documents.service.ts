import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AnnotationStatus, DepartmentType, RecipientKind, type User } from "@sigeda/database";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { DocumentArchivesService } from "../document-archives/document-archives.service.js";
import { AttachmentsService } from "../attachments/attachments.service.js";
import { PhysicalArchivesService } from "../physical-archives/physical-archives.service.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import type { CreateDocumentAnnotationDto } from "./dto/create-document-annotation.dto.js";
import type { CreateDocumentDto } from "./dto/create-document.dto.js";
import type { CreateDocumentVersionDto } from "./dto/create-document-version.dto.js";

type DepartmentNode = {
  id: string;
  type: DepartmentType;
  parent?: {
    id: string;
    type: DepartmentType;
    parent?: {
      id: string;
      type: DepartmentType;
    } | null;
  } | null;
} | null;

type AuthorWithScope = User & {
  role: { code: string; name: string };
  department: DepartmentNode;
};

type SignerRecordInput = {
  userId?: string;
  fullName: string;
  functionTitle?: string;
  departmentId: string;
  departmentType: DepartmentType;
  signingOrder?: number;
};

type EmitterScope = {
  emitterDirectionId: string;
  signerDepartmentId: string;
  signerDepartmentType: DepartmentType;
  bureauId: string | null;
  serviceId: string | null;
  directionId: string | null;
};

type PersistedDocumentArchive = {
  id: string;
  documentId: string;
  folderId: string;
  movementType: "ENTREE" | "SORTIE";
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archives: DocumentArchivesService,
    private readonly attachments: AttachmentsService,
    private readonly physicalArchives: PhysicalArchivesService
  ) {}

  async list() {
    const documents = await this.prisma.document.findMany({
      include: {
        emitterDirection: true,
        recipients: { include: { direction: true } },
        attachments: true,
        signers: {
          orderBy: [{ signingOrder: "asc" }, { createdAt: "asc" }]
        },
        versions: {
          include: {
            createdByUser: true
          },
          orderBy: { version: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return documents.map((document) => serializeDocument(document));
  }

  async get(id: string, principal?: AuthenticatedPrincipal) {
    const document = await this.getDocumentRecord(id);

    if (!document) {
      throw new NotFoundException("Document not found.");
    }

    const validationEvents = await this.getValidationTimelineEvents(document.id, getLatestVersion(document)?.version ?? 1);

    const currentUser = principal ? await this.resolveAuthenticatedAuthor(principal) : null;

    return serializeDocument(document, true, validationEvents, currentUser);
  }

  async getHistory(id: string) {
    const document = await this.getDocumentRecord(id);

    if (!document) {
      throw new NotFoundException("Document not found.");
    }

    const validationEvents = await this.getValidationTimelineEvents(document.id, getLatestVersion(document)?.version ?? 1);
    const lifecycle = buildLifecyclePayload(document, validationEvents);

    return {
      documentId: document.id,
      currentVersion: getLatestVersion(document)?.version ?? 1,
      versions: lifecycle.versionsHistory,
      annotations: lifecycle.annotations,
      transmissions: lifecycle.transmissions,
      timeline: lifecycle.timeline,
      pendingResponseDirectionIds: lifecycle.pendingResponseDirectionIds,
      pendingResponseDirectionNames: lifecycle.pendingResponseDirectionNames,
      respondedDirectionIds: lifecycle.respondedDirectionIds,
      respondedDirectionNames: lifecycle.respondedDirectionNames
    };
  }

  async create(input: CreateDocumentInput, principal: AuthenticatedPrincipal) {
    const author = await this.resolveAuthenticatedAuthor(principal);
    const reference = input.reference?.trim() || input.numeroReference?.trim() || "";
    const year = input.year ?? new Date().getFullYear();
    const type = input.type?.trim() || "";
    const title = input.title?.trim() || reference;

    if (!reference) {
      throw new BadRequestException("Document reference is required.");
    }

    if (!type) {
      throw new BadRequestException("Document type is required.");
    }

    return this.persistDocument({
      input,
      author,
      reference,
      year,
      title,
      type
    });
  }

  async createFromUpload(input: Record<string, unknown>, file: Express.Multer.File, principal: AuthenticatedPrincipal) {
    const author = await this.resolveAuthenticatedAuthor(principal);
    const reference = getString(input.numeroReference) || getString(input.reference);
    const year = getInt(input.year) ?? new Date().getFullYear();
    const type = getString(input.type);
    const title = getString(input.title) || file.originalname;

    if (!reference) {
      throw new BadRequestException("Document reference is required.");
    }

    if (!type) {
      throw new BadRequestException("Document type is required.");
    }

    return this.persistDocument({
      input: {
        reference,
        numeroReference: reference,
        year,
        title,
        subject: getOptionalString(input.subject),
        summary: getOptionalString(input.summary),
        type,
        emitterDirectionId: getOptionalString(input.emitterDirectionId) ?? undefined,
        receiverDirectionIds: getStringArray(input.receiverDirectionIds),
        copyDirectionIds: getStringArray(input.copyDirectionIds),
        signerName: getOptionalString(input.signerName) ?? undefined,
        signers: getSignerArray(input.signers)
      },
      author,
      reference,
      year,
      title,
      type,
      file
    });
  }

  async createAnnotation(
    documentId: string,
    input: CreateDocumentAnnotationDto,
    file: Express.Multer.File | undefined,
    principal: AuthenticatedPrincipal
  ) {
    const author = await this.resolveAuthenticatedAuthor(principal);
    const document = await this.getDocumentRecord(documentId);

    if (!document) {
      throw new NotFoundException("Document not found.");
    }

    const latestVersion = getLatestVersion(document);

    if (!latestVersion) {
      throw new BadRequestException("Le document ne dispose d'aucune version exploitable.");
    }

    const targetVersion =
      input.documentVersionId?.trim() ? document.versions.find((version) => version.id === input.documentVersionId) ?? null : latestVersion;

    if (!targetVersion) {
      throw new BadRequestException("La version cible de l'annotation est introuvable.");
    }

    const authorScope = resolveEmitterScope(author);
    const recordedByDirectionId = authorScope.directionId ?? authorScope.emitterDirectionId;

    if (!recordedByDirectionId) {
      throw new BadRequestException("Impossible de determiner la direction encodant l'annotation.");
    }

    const knownDirections = new Set([
      ...document.recipients.map((recipient) => recipient.directionId),
      document.emitterDirectionId,
      ...document.transmissions.map((transmission) => transmission.targetDirectionId)
    ]);

    if (!knownDirections.has(input.sourceDirectionId)) {
      throw new BadRequestException("La direction source de l'observation n'est pas liee a ce document.");
    }

    const comment = input.content?.trim() || null;

    if (!comment && !file) {
      throw new BadRequestException("Une annotation doit contenir un commentaire ou un fichier.");
    }

    const uploadedAttachment = file
      ? await this.attachments.uploadDocumentAnnotationAttachment({
          documentId: document.id,
          file
        })
      : null;

    const annotationId = randomUUID();
    const createdAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.documentAnnotation.create({
        data: {
          id: annotationId,
          documentId: document.id,
          documentVersionId: targetVersion.id,
          sourceDirectionId: input.sourceDirectionId,
          recordedByDirectionId,
          createdByUserId: author.id,
          content: comment ?? "",
          status: AnnotationStatus.PENDING,
          bucket: uploadedAttachment?.bucket,
          objectKey: uploadedAttachment?.objectKey,
          fileName: uploadedAttachment?.fileName,
          mimeType: uploadedAttachment?.mimeType,
          sizeBytes: uploadedAttachment?.sizeBytes,
          checksumSha256: uploadedAttachment?.checksumSha256,
          storageProvider: uploadedAttachment ? "MINIO" : undefined,
          createdAt,
          updatedAt: createdAt
        }
      });

      await tx.documentTransmission.updateMany({
        where: {
          documentId: document.id,
          documentVersionId: targetVersion.id,
          targetDirectionId: input.sourceDirectionId,
          respondedAt: null
        },
        data: {
          respondedAt: createdAt
        }
      });

      await tx.auditLog.create({
        data: {
          userId: author.id,
          action: uploadedAttachment ? "UPLOAD_DOCUMENT_ANNOTATION_FILE" : "CREATE_DOCUMENT_ANNOTATION",
          entityType: "DOCUMENT_ANNOTATION",
          entityId: annotationId,
          metadata: {
            description: `Annotation enregistree sur ${document.reference} V${targetVersion.version}`,
            documentId: document.id,
            documentReference: document.reference,
            documentVersionNumber: targetVersion.version,
            sourceDirectionId: input.sourceDirectionId,
            recordedByDirectionId,
            hasFile: Boolean(uploadedAttachment),
            userName: [author.nom, author.prenom].filter(Boolean).join(" ").trim() || author.email,
            email: author.email
          }
        }
      });
    });

    return this.get(documentId, principal);
  }

  async createVersion(documentId: string, input: CreateDocumentVersionDto, principal: AuthenticatedPrincipal) {
    const author = await this.resolveAuthenticatedAuthor(principal);
    const document = await this.getDocumentRecord(documentId);

    if (!document) {
      throw new NotFoundException("Document not found.");
    }

    const authorScope = resolveEmitterScope(author);
    const actorDirectionId = authorScope.directionId ?? authorScope.emitterDirectionId;

    if (actorDirectionId !== document.emitterDirectionId && author.role.code !== "ADMIN" && author.role.code !== "DIRECTEUR_GENERAL") {
      throw new BadRequestException("Seule la direction emettrice peut publier une nouvelle version.");
    }

    const latestVersion = getLatestVersion(document);
    const nextVersionNumber = (latestVersion?.version ?? 0) + 1;
    const receiverDirectionIds = uniqueStrings(input.receiverDirectionIds?.length ? input.receiverDirectionIds : getRecipientIds(document, "RECEIVER"));
    const copyDirectionIds = uniqueStrings(input.copyDirectionIds?.length ? input.copyDirectionIds : getRecipientIds(document, "COPY"));

    await this.validateRecipientDirections({
      emitterDirectionId: document.emitterDirectionId,
      receiverDirectionIds,
      copyDirectionIds
    });

    const sourceAnnotationIds = uniqueStrings(input.sourceAnnotationIds ?? []);

    if (sourceAnnotationIds.length) {
      const annotationCount = await this.prisma.documentAnnotation.count({
        where: {
          documentId,
          id: {
            in: sourceAnnotationIds
          }
        }
      });

      if (annotationCount !== sourceAnnotationIds.length) {
        throw new BadRequestException("Une ou plusieurs annotations sources sont invalides.");
      }
    }

    const nextReference = input.reference?.trim() || document.reference;
    const parsedReference = parseReference(nextReference);
    const nextType = input.type?.trim() || document.type;
    const nextTitle = input.title?.trim() || document.title;
    const nextSubject = normalizeNullable(input.subject, document.subject);
    const nextSummary = normalizeNullable(input.summary, document.summary);

    const duplicate = await this.prisma.document.findFirst({
      where: {
        id: {
          not: document.id
        },
        emitterDirectionId: document.emitterDirectionId,
        year: document.year,
        referenceNumber: parsedReference.referenceNumber
      },
      select: { id: true }
    });

    if (duplicate) {
      throw new ConflictException("Reference already exists for this emitter direction and year.");
    }

    const snapshot = buildDocumentSnapshot({
      documentId: document.id,
      reference: nextReference,
      referenceNumber: parsedReference.referenceNumber,
      year: document.year,
      title: nextTitle,
      subject: nextSubject,
      summary: nextSummary,
      type: nextType,
      emitterDirectionId: document.emitterDirectionId,
      receiverDirectionIds,
      copyDirectionIds,
      signerRecords:
        document.signers?.map((signer) => ({
          userId: signer.userId ?? undefined,
          fullName: signer.fullName,
          functionTitle: signer.functionTitle ?? undefined,
          departmentId: signer.departmentId,
          departmentType: signer.departmentType,
          signingOrder: signer.signingOrder ?? undefined
        })) ?? []
    });

    const versionId = randomUUID();
    const versionCreatedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: document.id },
        data: {
          reference: nextReference,
          referenceNumber: parsedReference.referenceNumber,
          title: nextTitle,
          subject: nextSubject,
          summary: nextSummary,
          type: nextType,
          status: "EN_VALIDATION",
          recipients: {
            deleteMany: {},
            create: [
              ...receiverDirectionIds.map((directionId) => ({ directionId, kind: "RECEIVER" as RecipientKind })),
              ...copyDirectionIds.map((directionId) => ({ directionId, kind: "COPY" as RecipientKind }))
            ]
          }
        }
      });

      await tx.documentVersion.create({
        data: {
          id: versionId,
          documentId: document.id,
          version: nextVersionNumber,
          snapshot,
          changeSummary: input.changeSummary.trim(),
          sourceAnnotationIds,
          createdById: author.id,
          createdAt: versionCreatedAt
        }
      });

      await tx.documentTransmission.createMany({
        data: [
          ...receiverDirectionIds.map((directionId) => ({
            id: randomUUID(),
            documentId: document.id,
            documentVersionId: versionId,
            targetDirectionId: directionId,
            kind: "RECEIVER" as RecipientKind,
            sentByUserId: author.id,
            sentAt: versionCreatedAt
          })),
          ...copyDirectionIds.map((directionId) => ({
            id: randomUUID(),
            documentId: document.id,
            documentVersionId: versionId,
            targetDirectionId: directionId,
            kind: "COPY" as RecipientKind,
            sentByUserId: author.id,
            sentAt: versionCreatedAt
          }))
        ]
      });

      if (sourceAnnotationIds.length) {
        await tx.documentAnnotation.updateMany({
          where: {
            id: {
              in: sourceAnnotationIds
            }
          },
          data: {
            status: AnnotationStatus.APPLIED
          }
        });
      }

      await tx.auditLog.createMany({
        data: [
          {
            userId: author.id,
            action: "CREATE_DOCUMENT_VERSION",
            entityType: "DOCUMENT_VERSION",
            entityId: versionId,
            metadata: {
              description: `Nouvelle version ${nextVersionNumber} publiee pour ${document.reference}`,
              documentId: document.id,
              documentReference: document.reference,
              documentVersionNumber: nextVersionNumber,
              sourceAnnotationIds,
              userName: [author.nom, author.prenom].filter(Boolean).join(" ").trim() || author.email,
              email: author.email
            }
          },
          {
            userId: author.id,
            action: "TRANSMIT_DOCUMENT_VERSION",
            entityType: "DOCUMENT_VERSION",
            entityId: versionId,
            metadata: {
              description: `Version ${nextVersionNumber} transmise aux directions concernees`,
              documentId: document.id,
              documentReference: document.reference,
              documentVersionNumber: nextVersionNumber,
              receiverDirectionIds,
              copyDirectionIds,
              userName: [author.nom, author.prenom].filter(Boolean).join(" ").trim() || author.email,
              email: author.email
            }
          }
        ]
      });
    });

    return this.get(document.id, principal);
  }

  async finalize(documentId: string, principal: AuthenticatedPrincipal) {
    const author = await this.resolveAuthenticatedAuthor(principal);
    const document = await this.getDocumentRecord(documentId);

    if (!document) {
      throw new NotFoundException("Document not found.");
    }

    const authorScope = resolveEmitterScope(author);
    const actorDirectionId = authorScope.directionId ?? authorScope.emitterDirectionId;

    if (actorDirectionId !== document.emitterDirectionId && author.role.code !== "ADMIN" && author.role.code !== "DIRECTEUR_GENERAL") {
      throw new BadRequestException("Seule la direction emettrice peut valider definitivement ce document.");
    }

    if (document.status === "VALIDE") {
      return this.get(document.id, principal);
    }

    if (document.status === "ARCHIVE") {
      throw new BadRequestException("Un document archive ne peut plus etre valide.");
    }

    const lifecycle = buildLifecyclePayload(document);

    if (lifecycle.pendingResponseDirectionIds.length > 0) {
      throw new BadRequestException("Toutes les directions sollicitees doivent repondre avant la validation finale.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: document.id },
        data: {
          status: "VALIDE"
        }
      });

      await tx.auditLog.create({
        data: {
          userId: author.id,
          action: "VALIDATE_DOCUMENT",
          entityType: "DOCUMENT",
          entityId: document.id,
          metadata: {
            description: `Validation finale du document ${document.reference}`,
            documentId: document.id,
            documentReference: document.reference,
            documentVersionNumber: getLatestVersion(document)?.version ?? 1,
            userName: [author.nom, author.prenom].filter(Boolean).join(" ").trim() || author.email,
            email: author.email,
            directionId: actorDirectionId
          }
        }
      });
    });

    return this.get(document.id, principal);
  }

  async classify(documentId: string, principal: AuthenticatedPrincipal) {
    await this.archives.classifyDocument(documentId, principal);

    return this.get(documentId, principal);
  }

  async getDocumentAnnotationAccessPayload(
    documentId: string,
    annotationId: string,
    principal: AuthenticatedPrincipal,
    request: RequestLike,
    disposition: "view" | "download" | undefined
  ) {
    const document = await this.getDocumentRecord(documentId);

    if (!document) {
      throw new NotFoundException("Document not found.");
    }

    const annotationExists = document.annotations.some((annotation: any) => annotation.id === annotationId);

    if (!annotationExists) {
      throw new NotFoundException("Annotation introuvable.");
    }

    return this.attachments.getDocumentAnnotationSecureAccessPayload(annotationId, principal, request, disposition);
  }

  private async persistDocument(input: {
    input: CreateDocumentInput;
    author: AuthorWithScope;
    reference: string;
    year: number;
    title: string;
    type: string;
    file?: Express.Multer.File;
  }) {
    const authorScope = resolveEmitterScope(input.author);
    const parsedReference = parseReference(input.reference);

    if (parsedReference.referenceNumber > 2_147_483_647) {
      throw new BadRequestException("La partie numerique de la reference est trop grande.");
    }

    const emitterDirection = await this.resolveEmitterDirection(input.author, input.input.emitterDirectionId, authorScope);
    const emitterDirectionId = emitterDirection.id;
    const signerScope = resolveSignerScope(authorScope, emitterDirectionId);
    const receiverDirectionIds = uniqueStrings(input.input.receiverDirectionIds ?? []).filter(Boolean);
    const copyDirectionIds = uniqueStrings(input.input.copyDirectionIds ?? []).filter(Boolean);

    await this.validateRecipientDirections({
      emitterDirectionId,
      receiverDirectionIds,
      copyDirectionIds
    });

    const signerRecords = await this.resolveSignerRecords(input.input, input.author, signerScope);

    if (!receiverDirectionIds.length) {
      throw new BadRequestException("At least one receiver direction is required.");
    }

    const duplicate = await this.prisma.document.findUnique({
      where: {
        emitterDirectionId_year_referenceNumber: {
          emitterDirectionId,
          year: input.year,
          referenceNumber: parsedReference.referenceNumber
        }
      }
    });

    if (duplicate) {
      throw new ConflictException("Reference already exists for this emitter direction and year.");
    }

    const documentId = randomUUID();
    const versionId = randomUUID();
    const createdAt = new Date();
    const attachment = input.file ? await this.attachments.uploadDocumentAttachment({ documentId, file: input.file }) : null;
    const snapshot = buildDocumentSnapshot({
      documentId,
      reference: input.reference,
      referenceNumber: parsedReference.referenceNumber,
      year: input.year,
      title: input.title,
      subject: input.input.subject?.trim() || null,
      summary: input.input.summary?.trim() || null,
      type: input.type,
      emitterDirectionId,
      receiverDirectionIds,
      copyDirectionIds,
      signerRecords
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.document.create({
        data: {
          id: documentId,
          reference: input.reference,
          referenceNumber: parsedReference.referenceNumber,
          year: input.year,
          title: input.title,
          subject: input.input.subject?.trim() || null,
          summary: input.input.summary?.trim() || null,
          type: input.type,
          status: "EN_VALIDATION",
          emitterDirectionId,
          authorId: input.author.id,
          recipients: {
            create: [
              ...receiverDirectionIds.map((directionId) => ({ directionId, kind: "RECEIVER" as RecipientKind })),
              ...copyDirectionIds.map((directionId) => ({ directionId, kind: "COPY" as RecipientKind }))
            ]
          },
          signers: signerRecords.length
            ? {
                create: signerRecords.map((signer) => ({
                  userId: signer.userId,
                  fullName: signer.fullName,
                  functionTitle: signer.functionTitle,
                  departmentId: signer.departmentId,
                  departmentType: signer.departmentType,
                  signingOrder: signer.signingOrder
                }))
              }
            : undefined,
          attachments: attachment
            ? {
                create: {
                  id: attachment.id,
                  bucket: attachment.bucket,
                  objectKey: attachment.objectKey,
                  fileName: attachment.fileName,
                  mimeType: attachment.mimeType,
                  sizeBytes: attachment.sizeBytes,
                  checksumSha256: attachment.checksumSha256,
                  version: attachment.version
                }
              }
            : undefined,
          versions: {
            create: {
              id: versionId,
              version: 1,
              snapshot,
              createdById: input.author.id,
              createdAt
            }
          },
          transmissions: {
            create: [
              ...receiverDirectionIds.map((directionId) => ({
                id: randomUUID(),
                documentVersionId: versionId,
                targetDirectionId: directionId,
                kind: "RECEIVER" as RecipientKind,
                sentByUserId: input.author.id,
                sentAt: createdAt
              })),
              ...copyDirectionIds.map((directionId) => ({
                id: randomUUID(),
                documentVersionId: versionId,
                targetDirectionId: directionId,
                kind: "COPY" as RecipientKind,
                sentByUserId: input.author.id,
                sentAt: createdAt
              }))
            ]
          }
        }
      });

      await tx.auditLog.createMany({
        data: [
          {
            userId: input.author.id,
            action: "CREATE_DOCUMENT",
            entityType: "DOCUMENT",
            entityId: documentId,
            metadata: {
              description: `Creation du document ${input.reference}`,
              reference: input.reference,
              year: input.year,
              emitterDirectionId,
              receiverDirectionIds,
              copyDirectionIds,
              signerCount: signerRecords.length,
              userName: [input.author.nom, input.author.prenom].filter(Boolean).join(" ").trim() || input.author.email,
              email: input.author.email
            }
          },
          {
            userId: input.author.id,
            action: "CREATE_DOCUMENT_VERSION",
            entityType: "DOCUMENT_VERSION",
            entityId: versionId,
            metadata: {
              description: `Version 1 creee pour ${input.reference}`,
              documentId,
              documentReference: input.reference,
              documentVersionNumber: 1,
              userName: [input.author.nom, input.author.prenom].filter(Boolean).join(" ").trim() || input.author.email,
              email: input.author.email
            }
          },
          {
            userId: input.author.id,
            action: "TRANSMIT_DOCUMENT_VERSION",
            entityType: "DOCUMENT_VERSION",
            entityId: versionId,
            metadata: {
              description: `Version 1 transmise aux directions concernees`,
              documentId,
              documentReference: input.reference,
              documentVersionNumber: 1,
              receiverDirectionIds,
              copyDirectionIds,
              userName: [input.author.nom, input.author.prenom].filter(Boolean).join(" ").trim() || input.author.email,
              email: input.author.email
            }
          }
        ]
      });
    });

    const documentArchives = await this.archives.syncForCreatedDocument({
      documentId,
      year: input.year,
      bureauId: authorScope.bureauId!,
      emitterDirectionId,
      receiverDirectionIds,
      copyDirectionIds,
      archivedById: input.author.id
    });

    const physicalArchives = await this.physicalArchives.ensureAutomaticForDocumentArchives({
      documentId,
      emitterDirectionId,
      year: input.year,
      documentArchives: documentArchives.map((archive): PersistedDocumentArchive => ({
        id: archive.id,
        documentId: archive.documentId,
        folderId: archive.folderId,
        movementType: archive.movementType
      }))
    });

    await this.prisma.auditLog.updateMany({
      where: {
        entityType: "DOCUMENT",
        entityId: documentId,
        action: "CREATE_DOCUMENT"
      },
      data: {
        metadata: {
          description: `Creation du document ${input.reference}`,
          reference: input.reference,
          year: input.year,
          emitterDirectionId,
          receiverDirectionIds,
          copyDirectionIds,
          signerCount: signerRecords.length,
          documentArchiveCount: documentArchives.length,
          physicalArchiveCount: physicalArchives.length,
          userName: [input.author.nom, input.author.prenom].filter(Boolean).join(" ").trim() || input.author.email,
          email: input.author.email
        }
      }
    });

    return this.get(documentId, {
      sub: input.author.keycloakId ?? "",
      email: input.author.email,
      roles: [input.author.role.code]
    });
  }

  private async resolveAuthenticatedAuthor(principal: AuthenticatedPrincipal) {
    const author = await this.prisma.user.findFirst({
      where: {
        OR: [{ keycloakId: principal.sub }, ...(principal.email ? [{ email: principal.email }] : [])]
      },
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

    if (!author) {
      throw new NotFoundException("Authenticated user not found in PostgreSQL.");
    }

    if (!author.department) {
      throw new BadRequestException("Authenticated user must be attached to an organizational department.");
    }

    const scope = resolveEmitterScope(author);

    if (!scope.directionId || !scope.bureauId) {
      throw new BadRequestException("Authenticated user must be attached to a bureau within an owning direction.");
    }

    return author;
  }

  private async getDocumentRecord(id: string) {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        emitterDirection: true,
        author: true,
        recipients: { include: { direction: true } },
        archives: {
          include: {
            folder: {
              include: {
                ownerDirection: {
                  select: {
                    id: true,
                    code: true,
                    designation: true
                  }
                }
              }
            }
          }
        },
        attachments: true,
        signers: {
          orderBy: [{ signingOrder: "asc" }, { createdAt: "asc" }]
        },
        versions: {
          include: {
            createdByUser: true
          },
          orderBy: { version: "asc" }
        },
        annotations: {
          include: {
            sourceDirection: true,
            recordedByDirection: true,
            createdByUser: true,
            documentVersion: {
              select: {
                id: true,
                version: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        transmissions: {
          include: {
            targetDirection: true,
            sentByUser: true,
            documentVersion: {
              select: {
                id: true,
                version: true
              }
            }
          },
          orderBy: { sentAt: "asc" }
        }
      }
    });
  }

  private async getValidationTimelineEvents(documentId: string, fallbackVersionNumber: number) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: "VALIDATE_DOCUMENT",
        entityType: "DOCUMENT",
        entityId: documentId
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return logs.map((log) => {
      const metadata = isRecord(log.metadata) ? log.metadata : {};

      return {
        id: `validation-${log.id}`,
        type: "DOCUMENT_VALIDATED" as const,
        documentId,
        documentVersionNumber: getNumericValue(metadata.documentVersionNumber) ?? fallbackVersionNumber,
        label: "Validation finale",
        description: "Document valide et cloture pour diffusion et archivage.",
        actorName:
          [log.user?.nom, log.user?.prenom].filter(Boolean).join(" ").trim() || getString(metadata.userName) || log.user?.email || undefined,
        directionName: undefined,
        createdAt: log.createdAt.toISOString()
      };
    });
  }

  private async resolveEmitterDirection(
    author: AuthorWithScope,
    requestedEmitterDirectionId: string | undefined,
    authorScope: EmitterScope
  ) {
    const requestedId = requestedEmitterDirectionId?.trim();

    if (!requestedId || requestedId === authorScope.emitterDirectionId) {
      return this.prisma.department.findUniqueOrThrow({
        where: { id: authorScope.emitterDirectionId }
      });
    }

    const emitterDirection = await this.prisma.department.findFirst({
      where: {
        id: requestedId,
        type: {
          in: [DepartmentType.DIRECTION, DepartmentType.DIRECTION_GENERALE]
        }
      }
    });

    if (!emitterDirection) {
      throw new BadRequestException("La direction emettrice selectionnee est invalide.");
    }

    return emitterDirection;
  }

  private async resolveSignerRecords(input: CreateDocumentInput, author: AuthorWithScope, emitterScope: EmitterScope) {
    const requestedSigners = input.signers ?? [];

    if (!requestedSigners.length) {
      const signerName = input.signerName?.trim();

      if (!signerName) {
        return [];
      }

      return [
        {
          userId: undefined,
          fullName: signerName,
          functionTitle: author.role.name,
          departmentId: emitterScope.signerDepartmentId,
          departmentType: emitterScope.signerDepartmentType,
          signingOrder: 1
        }
      ] satisfies SignerRecordInput[];
    }

    const signerUserIds = uniqueStrings(
      requestedSigners.map((signer) => signer.userId?.trim()).filter((value): value is string => Boolean(value))
    );

    if (!signerUserIds.length) {
      throw new BadRequestException("At least one signer user must be selected.");
    }

    const signerUsers = await this.prisma.user.findMany({
      where: {
        id: {
          in: signerUserIds
        }
      },
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

    if (signerUsers.length !== signerUserIds.length) {
      throw new BadRequestException("One or more selected signers could not be found.");
    }

    const signerMap = new Map(signerUsers.map((user) => [user.id, user]));

    return requestedSigners.map((signer, index) => {
      if (!signer.userId) {
        throw new BadRequestException("Signer user selection is required.");
      }

      const user = signerMap.get(signer.userId);

      if (!user) {
        throw new BadRequestException("Selected signer is invalid.");
      }

      if (!isUserWithinEmitterScope(user, emitterScope)) {
        throw new BadRequestException("Selected signer must belong to the emitter structure scope.");
      }

      return {
        userId: user.id,
        fullName: [user.nom, user.prenom].filter(Boolean).join(" ").trim() || user.email,
        functionTitle: user.role.name,
        departmentId: emitterScope.signerDepartmentId,
        departmentType: emitterScope.signerDepartmentType,
        signingOrder: signer.signingOrder ?? index + 1
      } satisfies SignerRecordInput;
    });
  }

  private async validateRecipientDirections(input: {
    emitterDirectionId: string;
    receiverDirectionIds: string[];
    copyDirectionIds: string[];
  }) {
    const overlap = input.receiverDirectionIds.filter((directionId) => input.copyDirectionIds.includes(directionId));

    if (overlap.length > 0) {
      throw new BadRequestException("Une meme direction ne peut pas etre a la fois destinataire et en copie.");
    }

    const allTargetIds = uniqueStrings([...input.receiverDirectionIds, ...input.copyDirectionIds]);

    if (allTargetIds.includes(input.emitterDirectionId)) {
      throw new BadRequestException("La direction emettrice ne peut pas etre selectionnee comme destinataire ou copie.");
    }

    if (!allTargetIds.length) {
      return;
    }

    const directions = await this.prisma.department.findMany({
      where: {
        id: {
          in: allTargetIds
        },
        type: {
          in: [DepartmentType.DIRECTION, DepartmentType.DIRECTION_GENERALE]
        }
      },
      select: {
        id: true
      }
    });

    if (directions.length !== allTargetIds.length) {
      throw new BadRequestException("Une ou plusieurs directions cibles sont invalides.");
    }
  }
}

type CreateDocumentInput = {
  reference?: string;
  numeroReference?: string;
  referenceNumber?: number;
  year?: number;
  title?: string;
  subject?: string;
  summary?: string;
  type?: string;
  emitterDirectionId?: string;
  receiverDirectionIds?: string[];
  copyDirectionIds?: string[];
  signerName?: string;
  signers?: Array<{
    userId?: string;
    fullName?: string;
    functionTitle?: string;
    departmentId?: string;
    departmentType?: DepartmentType;
    signingOrder?: number;
  }>;
};

function resolveSignerScope(authorScope: EmitterScope, emitterDirectionId: string): EmitterScope {
  if (authorScope.emitterDirectionId === emitterDirectionId) {
    return authorScope;
  }

  return {
    emitterDirectionId,
    signerDepartmentId: emitterDirectionId,
    signerDepartmentType: DepartmentType.DIRECTION,
    bureauId: authorScope.bureauId,
    serviceId: null,
    directionId: emitterDirectionId
  };
}

function serializeDocument(document: any, includeLifecycle = false, validationEvents: any[] = [], currentUser?: AuthorWithScope | null) {
  const serializedSigners =
    document.signers?.map((signer: any) => ({
      userId: signer.userId ?? undefined,
      fullName: signer.fullName,
      functionTitle: signer.functionTitle ?? undefined,
      departmentId: signer.departmentId,
      departmentType: signer.departmentType,
      signingOrder: signer.signingOrder ?? undefined
    })) ?? [];

  const lifecycle = includeLifecycle ? buildLifecyclePayload(document, validationEvents) : null;
  const latestVersion = getLatestVersion(document);

  const currentScope = currentUser ? resolveEmitterScope(currentUser) : null;
  const currentDirectionId = currentScope?.directionId ?? null;
  const targetDirectionIds = [
    ...document.recipients.filter((recipient: any) => recipient.kind === "RECEIVER").map((recipient: any) => recipient.directionId),
    ...document.recipients.filter((recipient: any) => recipient.kind === "COPY").map((recipient: any) => recipient.directionId)
  ];
  const currentDirectionArchives =
    currentDirectionId
      ? (document.archives ?? []).filter((archive: any) => archive.folder?.ownerDirectionId === currentDirectionId)
      : [];
  const currentDirectionMovement =
    currentDirectionId === document.emitterDirectionId
      ? "SORTIE"
      : currentDirectionId && targetDirectionIds.includes(currentDirectionId)
        ? "ENTREE"
        : undefined;
  const currentDirectionArchivedAt = currentDirectionArchives
    .map((archive: any) => archive.archivedAt?.toISOString?.() ?? archive.archivedAt)
    .filter(Boolean)
    .sort((left: string, right: string) => Date.parse(right) - Date.parse(left))[0];

  return {
    ...document,
    version: latestVersion?.version ?? document.versions?.length ?? 1,
    signerName: serializedSigners[0]?.fullName,
    signers: serializedSigners,
    attachments: document.attachments?.map((attachment: any) => ({
      ...attachment,
      sizeBytes: Number(attachment.sizeBytes)
    })),
    versionsHistory: lifecycle?.versionsHistory,
    annotations: lifecycle?.annotations,
    transmissions: lifecycle?.transmissions,
    timeline: lifecycle?.timeline,
    pendingResponseDirectionIds: lifecycle?.pendingResponseDirectionIds,
    pendingResponseDirectionNames: lifecycle?.pendingResponseDirectionNames,
    respondedDirectionIds: lifecycle?.respondedDirectionIds,
    respondedDirectionNames: lifecycle?.respondedDirectionNames,
    canClassify: Boolean(currentDirectionId && currentDirectionMovement && currentDirectionArchives.length === 0),
    currentDirectionMovement,
    currentDirectionArchivedAt
  };
}

function buildLifecyclePayload(document: any, validationEvents: any[] = []) {
  const versionsHistory =
    document.versions?.map((version: any) => ({
      id: version.id,
      documentId: version.documentId,
      version: version.version,
      changeSummary: version.changeSummary ?? undefined,
      sourceAnnotationIds: version.sourceAnnotationIds ?? [],
      createdById: version.createdById,
      createdByName:
        [version.createdByUser?.nom, version.createdByUser?.prenom].filter(Boolean).join(" ").trim() ||
        version.createdByUser?.email ||
        undefined,
      createdAt: version.createdAt.toISOString()
    })) ?? [];

  const annotations =
    document.annotations?.map((annotation: any) => ({
      id: annotation.id,
      documentId: annotation.documentId,
      documentVersionId: annotation.documentVersionId,
      documentVersionNumber: annotation.documentVersion?.version ?? 1,
      sourceDirectionId: annotation.sourceDirectionId,
      sourceDirectionCode: annotation.sourceDirection?.code,
      sourceDirectionName: annotation.sourceDirection?.designation,
      recordedByDirectionId: annotation.recordedByDirectionId,
      recordedByDirectionCode: annotation.recordedByDirection?.code,
      recordedByDirectionName: annotation.recordedByDirection?.designation,
      createdByUserId: annotation.createdByUserId,
      createdByUserName:
        [annotation.createdByUser?.nom, annotation.createdByUser?.prenom].filter(Boolean).join(" ").trim() ||
        annotation.createdByUser?.email ||
        undefined,
      status: annotation.status,
      content: annotation.content,
      attachment:
        annotation.objectKey && annotation.fileName
          ? {
              name: annotation.fileName,
              filePath: annotation.objectKey,
              mimeType: annotation.mimeType ?? undefined,
              sizeBytes: annotation.sizeBytes ? Number(annotation.sizeBytes) : undefined,
              fileUrl: `/documents/${annotation.documentId}/annotations/${annotation.id}/access`
            }
          : undefined,
      createdAt: annotation.createdAt.toISOString(),
      updatedAt: annotation.updatedAt.toISOString()
    })) ?? [];

  const transmissions =
    document.transmissions?.map((transmission: any) => ({
      id: transmission.id,
      documentId: transmission.documentId,
      documentVersionId: transmission.documentVersionId,
      documentVersionNumber: transmission.documentVersion?.version ?? 1,
      targetDirectionId: transmission.targetDirectionId,
      targetDirectionCode: transmission.targetDirection?.code,
      targetDirectionName: transmission.targetDirection?.designation,
      kind: transmission.kind,
      sentByUserId: transmission.sentByUserId,
      sentByUserName:
        [transmission.sentByUser?.nom, transmission.sentByUser?.prenom].filter(Boolean).join(" ").trim() ||
        transmission.sentByUser?.email ||
        undefined,
      sentAt: transmission.sentAt.toISOString(),
      respondedAt: transmission.respondedAt?.toISOString()
    })) ?? [];

  const timeline = [
    ...versionsHistory.map((version: any) => ({
      id: `version-${version.id}`,
      type: version.version === 1 ? ("DOCUMENT_CREATED" as const) : ("VERSION_CREATED" as const),
      documentId: version.documentId,
      documentVersionNumber: version.version,
      label: version.version === 1 ? `Creation V${version.version}` : `Creation V${version.version}`,
      description: version.changeSummary || (version.version === 1 ? "Creation initiale du document" : "Nouvelle version du document"),
      actorName: version.createdByName,
      directionName: undefined,
      createdAt: version.createdAt
    })),
    ...transmissions.map((transmission: any) => ({
      id: `transmission-${transmission.id}`,
      type: "TRANSMISSION_SENT" as const,
      documentId: transmission.documentId,
      documentVersionNumber: transmission.documentVersionNumber,
      label: `Transmission V${transmission.documentVersionNumber}`,
      description: `${transmission.kind === "COPY" ? "Copie a" : "Transmission a"} ${transmission.targetDirectionName ?? transmission.targetDirectionCode ?? transmission.targetDirectionId}`,
      actorName: transmission.sentByUserName,
      directionName: transmission.targetDirectionName ?? transmission.targetDirectionCode,
      createdAt: transmission.sentAt
    })),
    ...annotations.map((annotation: any) => ({
      id: `annotation-${annotation.id}`,
      type: "ANNOTATION_CREATED" as const,
      documentId: annotation.documentId,
      documentVersionNumber: annotation.documentVersionNumber,
      label: `Annotation V${annotation.documentVersionNumber}`,
      description: `Observation provenant de ${annotation.sourceDirectionName ?? annotation.sourceDirectionCode ?? annotation.sourceDirectionId}`,
      actorName: annotation.createdByUserName,
      directionName: annotation.recordedByDirectionName ?? annotation.recordedByDirectionCode,
      createdAt: annotation.createdAt
    })),
    ...validationEvents
  ].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

  const latestVersion = versionsHistory[versionsHistory.length - 1];
  const latestTransmissions = transmissions.filter(
    (transmission: any) => transmission.documentVersionNumber === (latestVersion?.version ?? 1)
  );
  const pendingResponseDirectionIds = latestTransmissions
    .filter((transmission: any) => !transmission.respondedAt)
    .map((transmission: any) => transmission.targetDirectionId);
  const pendingResponseDirectionNames = latestTransmissions
    .filter((transmission: any) => !transmission.respondedAt)
    .map((transmission: any) => transmission.targetDirectionName ?? transmission.targetDirectionCode ?? transmission.targetDirectionId);
  const respondedDirectionIds = latestTransmissions
    .filter((transmission: any) => Boolean(transmission.respondedAt))
    .map((transmission: any) => transmission.targetDirectionId);
  const respondedDirectionNames = latestTransmissions
    .filter((transmission: any) => Boolean(transmission.respondedAt))
    .map((transmission: any) => transmission.targetDirectionName ?? transmission.targetDirectionCode ?? transmission.targetDirectionId);

  return {
    versionsHistory,
    annotations,
    transmissions,
    timeline,
    pendingResponseDirectionIds,
    pendingResponseDirectionNames,
    respondedDirectionIds,
    respondedDirectionNames
  };
}

function buildDocumentSnapshot(input: {
  documentId: string;
  reference: string;
  referenceNumber: number;
  year: number;
  title: string;
  subject?: string | null;
  summary?: string | null;
  type: string;
  emitterDirectionId: string;
  receiverDirectionIds: string[];
  copyDirectionIds: string[];
  signerRecords: SignerRecordInput[];
}) {
  return {
    documentId: input.documentId,
    reference: input.reference,
    referenceNumber: input.referenceNumber,
    year: input.year,
    title: input.title,
    subject: input.subject ?? null,
    summary: input.summary ?? null,
    type: input.type,
    emitterDirectionId: input.emitterDirectionId,
    receiverDirectionIds: input.receiverDirectionIds,
    copyDirectionIds: input.copyDirectionIds,
    signers: input.signerRecords
  };
}

function getLatestVersion(document: any) {
  if (!document.versions?.length) {
    return null;
  }

  return document.versions[document.versions.length - 1];
}

function getRecipientIds(document: any, kind: RecipientKind) {
  return document.recipients.filter((recipient: any) => recipient.kind === kind).map((recipient: any) => recipient.directionId);
}

function normalizeNullable(nextValue: string | undefined, currentValue: string | null) {
  if (nextValue === undefined) {
    return currentValue;
  }

  const trimmed = nextValue.trim();
  return trimmed || null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOptionalString(value: unknown) {
  const normalized = getString(value);
  return normalized || undefined;
}

function getInt(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

function getStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }

  if (value && typeof value === "object") {
    const values = Object.values(value as Record<string, unknown>).map((entry) => String(entry)).filter(Boolean);

    if (values.length > 0) {
      return values;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry)).filter(Boolean);
      }
    } catch {
      return trimmed
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .replace(/"/g, "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  return [];
}

type RequestLike = {
  headers: Record<string, string | string[] | undefined> & {
    "user-agent"?: string;
    "x-forwarded-for"?: string;
  };
  ip?: string;
};

function getSignerArray(value: unknown): CreateDocumentInput["signers"] {
  if (Array.isArray(value)) {
    return value as CreateDocumentInput["signers"];
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as CreateDocumentInput["signers"]) : [];
  } catch {
    return [];
  }
}

function parseReference(reference: string) {
  const match = reference.trim().match(/^(.*?)(\d+)\s*$/);

  if (!match) {
    return {
      referenceCode: reference.trim() || "REF",
      referenceNumber: 0
    };
  }

  return {
    referenceCode: match[1].replace(/[-\s]+$/, "") || reference.trim(),
    referenceNumber: Number.parseInt(match[2], 10)
  };
}

function resolveEmitterScope(author: AuthorWithScope): EmitterScope {
  const department = author.department;

  if (!department) {
    throw new BadRequestException("Authenticated user must be attached to a department.");
  }

  if (department.type === "BUREAU") {
    const scope = resolveDepartmentScope(department);
    return {
      emitterDirectionId: scope.directionId ?? "",
      signerDepartmentId: department.id,
      signerDepartmentType: DepartmentType.BUREAU,
      bureauId: department.id,
      serviceId: scope.serviceId,
      directionId: scope.directionId
    };
  }

  if (department.type === "SERVICE") {
    return {
      emitterDirectionId: department.parent?.id ?? "",
      signerDepartmentId: department.id,
      signerDepartmentType: DepartmentType.SERVICE,
      bureauId: null,
      serviceId: department.id,
      directionId: department.parent?.id ?? null
    };
  }

  return {
    emitterDirectionId: department.id,
    signerDepartmentId: department.id,
    signerDepartmentType: department.type,
    bureauId: null,
    serviceId: null,
    directionId: department.id
  };
}

function isUserWithinEmitterScope(
  user: User & {
    role: { code: string; name: string };
    department: DepartmentNode;
  },
  emitterScope: EmitterScope
) {
  const scope = resolveDepartmentScope(user.department);

  if (emitterScope.signerDepartmentType === DepartmentType.BUREAU) {
    return scope.bureauId === emitterScope.signerDepartmentId;
  }

  if (emitterScope.signerDepartmentType === DepartmentType.SERVICE) {
    return scope.serviceId === emitterScope.signerDepartmentId;
  }

  return scope.directionId === emitterScope.signerDepartmentId;
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}
