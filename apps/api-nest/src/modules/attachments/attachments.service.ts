import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import type { DepartmentType, User } from "@sigeda/database";
import { Client } from "minio";
import { PrismaService } from "../prisma/prisma.service.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";

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

type ScopedUser = User & {
  role: { code: string; name: string };
  department: DepartmentNode;
};

type AttachmentRecord = {
  id: string;
  documentId: string;
  bucket: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  document: {
    id: string;
    reference: string;
    emitterDirectionId: string;
    author: {
      id: string;
      department: DepartmentNode;
    };
    archives: Array<{
      bureauId: string;
      movementType: "ENTREE" | "SORTIE";
    }>;
  };
};

type ArchiveAnnotationRecord = {
  id: string;
  documentArchiveId: string;
  bucket: string | null;
  objectKey: string | null;
  fileName: string | null;
  mimeType: string | null;
  documentArchive: {
    id: string;
    bureauId: string;
    folder: {
      ownerDirectionId: string;
    };
    document: {
      emitterDirectionId: string;
      recipients: Array<{
        directionId: string;
      }>;
    };
  };
};

type DocumentAnnotationRecord = {
  id: string;
  documentId: string;
  bucket: string | null;
  objectKey: string | null;
  fileName: string | null;
  mimeType: string | null;
  document: {
    id: string;
    emitterDirectionId: string;
    recipients: Array<{
      directionId: string;
    }>;
    archives: Array<{
      bureauId: string;
      folder: {
        ownerDirectionId: string;
      };
    }>;
  };
};

@Injectable()
export class AttachmentsService {
  private readonly client: Client;
  private readonly publicClient: Client;
  private bucketReady = false;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = new URL(process.env.MINIO_ENDPOINT ?? "http://localhost:9000");
    const publicEndpoint = new URL(process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? "http://localhost:9000");
    this.client = new Client({
      endPoint: endpoint.hostname,
      port: Number.parseInt(endpoint.port || (endpoint.protocol === "https:" ? "443" : "80"), 10),
      useSSL: endpoint.protocol === "https:",
      accessKey: process.env.MINIO_ACCESS_KEY ?? "sigeda",
      secretKey: process.env.MINIO_SECRET_KEY ?? "SigedaMinio_2026!",
      region: process.env.MINIO_REGION ?? "us-east-1"
    });
    this.publicClient = new Client({
      endPoint: publicEndpoint.hostname,
      port: Number.parseInt(publicEndpoint.port || (publicEndpoint.protocol === "https:" ? "443" : "80"), 10),
      useSSL: publicEndpoint.protocol === "https:",
      accessKey: process.env.MINIO_ACCESS_KEY ?? "sigeda",
      secretKey: process.env.MINIO_SECRET_KEY ?? "SigedaMinio_2026!",
      region: process.env.MINIO_REGION ?? "us-east-1"
    });
  }

  computeChecksum(buffer: Buffer) {
    return createHash("sha256").update(buffer).digest("hex");
  }

  storagePlan() {
    return {
      provider: "MINIO",
      bucket: process.env.MINIO_BUCKET ?? "sigeda-documents",
      endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
      publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
      status: "planned"
    };
  }

  async uploadDocumentAttachment(input: {
    documentId: string;
    file: Express.Multer.File;
  }) {
    await this.ensureBucket();

    const bucket = process.env.MINIO_BUCKET ?? "sigeda-documents";
    const objectKey = buildObjectKey(input.documentId, input.file.originalname);
    const checksumSha256 = this.computeChecksum(input.file.buffer);

    await this.client.putObject(bucket, objectKey, input.file.buffer, input.file.size, {
      "Content-Type": input.file.mimetype,
      "X-Amz-Meta-Checksum-Sha256": checksumSha256
    });

    return {
      id: randomUUID(),
      bucket,
      objectKey,
      fileName: input.file.originalname,
      mimeType: input.file.mimetype,
      sizeBytes: BigInt(input.file.size),
      checksumSha256,
      version: 1
    };
  }

  async uploadArchiveAnnotationAttachment(input: {
    archiveId: string;
    file: Express.Multer.File;
  }) {
    await this.ensureBucket();

    const bucket = process.env.MINIO_BUCKET ?? "sigeda-documents";
    const objectKey = buildArchiveAnnotationObjectKey(input.archiveId, input.file.originalname);
    const checksumSha256 = this.computeChecksum(input.file.buffer);

    await this.client.putObject(bucket, objectKey, input.file.buffer, input.file.size, {
      "Content-Type": input.file.mimetype,
      "X-Amz-Meta-Checksum-Sha256": checksumSha256
    });

    return {
      bucket,
      objectKey,
      fileName: input.file.originalname,
      mimeType: input.file.mimetype,
      sizeBytes: BigInt(input.file.size),
      checksumSha256
    };
  }

  async uploadDocumentAnnotationAttachment(input: {
    documentId: string;
    file: Express.Multer.File;
  }) {
    await this.ensureBucket();

    const bucket = process.env.MINIO_BUCKET ?? "sigeda-documents";
    const objectKey = buildDocumentAnnotationObjectKey(input.documentId, input.file.originalname);
    const checksumSha256 = this.computeChecksum(input.file.buffer);

    await this.client.putObject(bucket, objectKey, input.file.buffer, input.file.size, {
      "Content-Type": input.file.mimetype,
      "X-Amz-Meta-Checksum-Sha256": checksumSha256
    });

    return {
      bucket,
      objectKey,
      fileName: input.file.originalname,
      mimeType: input.file.mimetype,
      sizeBytes: BigInt(input.file.size),
      checksumSha256
    };
  }

  async getSecureAccessPayload(
    id: string,
    principal: AuthenticatedPrincipal,
    request: RequestLike,
    disposition: "view" | "download" | undefined
  ) {
    const accessMode = disposition === "download" ? "download" : "view";
    const { attachment, user } = await this.resolveAccessibleAttachment(id, principal);
    await this.ensureBucket();

    try {
      const url = await this.publicClient.presignedGetObject(attachment.bucket, attachment.objectKey, 300, {
        "response-content-disposition": `${accessMode === "download" ? "attachment" : "inline"}; filename="${sanitizeDispositionFileName(
          attachment.fileName
        )}"`,
        "response-content-type": attachment.mimeType
      });

      await this.logFileAudit({
        action: accessMode === "download" ? "DOWNLOAD_FILE" : "VIEW_FILE",
        attachment,
        userId: user.id,
        userName: buildUserName(user),
        email: user.email,
        request
      });

      return {
        url,
        expiresIn: 300
      };
    } catch (error) {
      throw new InternalServerErrorException(`Unable to create secure attachment URL: ${String(error)}`);
    }
  }

  async getDownloadPayload(id: string, principal: AuthenticatedPrincipal, request: RequestLike) {
    const { attachment, user } = await this.resolveAccessibleAttachment(id, principal);
    await this.ensureBucket();

    let stream: Readable;

    try {
      stream = (await this.client.getObject(attachment.bucket, attachment.objectKey)) as Readable;
    } catch (error) {
      throw new InternalServerErrorException(`Unable to open attachment from MinIO: ${String(error)}`);
    }

    await this.logFileAudit({
      action: "DOWNLOAD_FILE",
      attachment,
      userId: user.id,
      userName: buildUserName(user),
      email: user.email,
      request
    });

    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      stream
    };
  }

  async getArchiveAnnotationSecureAccessPayload(
    annotationId: string,
    principal: AuthenticatedPrincipal,
    request: RequestLike,
    disposition: "view" | "download" | undefined
  ) {
    const accessMode = disposition === "download" ? "download" : "view";
    const { annotation, user } = await this.resolveAccessibleArchiveAnnotation(annotationId, principal);

    if (!annotation.bucket || !annotation.objectKey || !annotation.fileName || !annotation.mimeType) {
      throw new NotFoundException("Aucun fichier n'est associe a cette annotation.");
    }

    await this.ensureBucket();

    try {
      const url = await this.publicClient.presignedGetObject(annotation.bucket, annotation.objectKey, 300, {
        "response-content-disposition": `${accessMode === "download" ? "attachment" : "inline"}; filename="${sanitizeDispositionFileName(
          annotation.fileName
        )}"`,
        "response-content-type": annotation.mimeType
      });

      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: accessMode === "download" ? "DOWNLOAD_FILE" : "VIEW_FILE",
          entityType: "DOCUMENT_ARCHIVE_ANNOTATION",
          entityId: annotation.id,
          ipAddress: extractIpAddress(request),
          userAgent: request.headers["user-agent"] ?? null,
          metadata: {
            description:
              accessMode === "download"
                ? `Telechargement du fichier ${annotation.fileName}`
                : `Consultation du fichier ${annotation.fileName}`,
            userName: buildUserName(user),
            email: user.email,
            documentArchiveId: annotation.documentArchiveId,
            fileName: annotation.fileName
          }
        }
      });

      return {
        url,
        expiresIn: 300
      };
    } catch (error) {
      throw new InternalServerErrorException(`Unable to create secure archive annotation URL: ${String(error)}`);
    }
  }

  async getDocumentAnnotationSecureAccessPayload(
    annotationId: string,
    principal: AuthenticatedPrincipal,
    request: RequestLike,
    disposition: "view" | "download" | undefined
  ) {
    const accessMode = disposition === "download" ? "download" : "view";
    const { annotation, user } = await this.resolveAccessibleDocumentAnnotation(annotationId, principal);

    if (!annotation.bucket || !annotation.objectKey || !annotation.fileName || !annotation.mimeType) {
      throw new NotFoundException("Aucun fichier n'est associe a cette annotation.");
    }

    await this.ensureBucket();

    try {
      const url = await this.publicClient.presignedGetObject(annotation.bucket, annotation.objectKey, 300, {
        "response-content-disposition": `${accessMode === "download" ? "attachment" : "inline"}; filename="${sanitizeDispositionFileName(
          annotation.fileName
        )}"`,
        "response-content-type": annotation.mimeType
      });

      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: accessMode === "download" ? "DOWNLOAD_FILE" : "VIEW_FILE",
          entityType: "DOCUMENT_ANNOTATION",
          entityId: annotation.id,
          ipAddress: extractIpAddress(request),
          userAgent: request.headers["user-agent"] ?? null,
          metadata: {
            description:
              accessMode === "download"
                ? `Telechargement du fichier ${annotation.fileName}`
                : `Consultation du fichier ${annotation.fileName}`,
            userName: buildUserName(user),
            email: user.email,
            documentId: annotation.documentId,
            fileName: annotation.fileName
          }
        }
      });

      return {
        url,
        expiresIn: 300
      };
    } catch (error) {
      throw new InternalServerErrorException(`Unable to create secure document annotation URL: ${String(error)}`);
    }
  }

  private async resolveAccessibleAttachment(id: string, principal: AuthenticatedPrincipal) {
    const [attachment, user] = await Promise.all([
      this.prisma.attachment.findUnique({
        where: { id },
        include: {
          document: {
            include: {
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
              archives: {
                select: {
                  bureauId: true,
                  movementType: true
                }
              }
            }
          }
        }
      }) as Promise<AttachmentRecord | null>,
      this.findUserByPrincipal(principal)
    ]);

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    if (!user) {
      throw new ForbiddenException("Utilisateur authentifie introuvable.");
    }

    if (!canAccessDocumentAttachment(user, attachment)) {
      throw new ForbiddenException("Vous n'etes pas autorise a consulter ce fichier.");
    }

    return {
      attachment,
      user
    };
  }

  private async resolveAccessibleArchiveAnnotation(id: string, principal: AuthenticatedPrincipal) {
    const [annotation, user] = await Promise.all([
      this.prisma.documentArchiveAnnotation.findUnique({
        where: { id },
        include: {
          documentArchive: {
            include: {
              folder: {
                select: {
                  ownerDirectionId: true
                }
              },
              document: {
                select: {
                  emitterDirectionId: true,
                  recipients: {
                    select: {
                      directionId: true
                    }
                  }
                }
              }
            }
          }
        }
      }) as Promise<ArchiveAnnotationRecord | null>,
      this.findUserByPrincipal(principal)
    ]);

    if (!annotation) {
      throw new NotFoundException("Annotation introuvable.");
    }

    if (!user) {
      throw new ForbiddenException("Utilisateur authentifie introuvable.");
    }

    if (!canAccessArchiveAnnotation(user, annotation)) {
      throw new ForbiddenException("Vous n'etes pas autorise a consulter ce fichier.");
    }

    return {
      annotation,
      user
    };
  }

  private async resolveAccessibleDocumentAnnotation(id: string, principal: AuthenticatedPrincipal) {
    const [annotation, user] = await Promise.all([
      this.prisma.documentAnnotation.findUnique({
        where: { id },
        include: {
          document: {
            select: {
              id: true,
              emitterDirectionId: true,
              recipients: {
                select: {
                  directionId: true
                }
              },
              archives: {
                select: {
                  bureauId: true,
                  folder: {
                    select: {
                      ownerDirectionId: true
                    }
                  }
                }
              }
            }
          }
        }
      }) as Promise<DocumentAnnotationRecord | null>,
      this.findUserByPrincipal(principal)
    ]);

    if (!annotation) {
      throw new NotFoundException("Annotation introuvable.");
    }

    if (!user) {
      throw new ForbiddenException("Utilisateur authentifie introuvable.");
    }

    if (!canAccessDocumentAnnotation(user, annotation)) {
      throw new ForbiddenException("Vous n'etes pas autorise a consulter ce fichier.");
    }

    return {
      annotation,
      user
    };
  }

  private async findUserByPrincipal(principal: AuthenticatedPrincipal) {
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

    const byKeycloakId = (await this.prisma.user.findUnique({
      where: { keycloakId: principal.sub },
      include
    })) as ScopedUser | null;

    if (byKeycloakId) {
      return byKeycloakId;
    }

    const normalizedEmail = principal.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    return (await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive"
        }
      },
      include
    })) as ScopedUser | null;
  }

  private async logFileAudit(input: {
    action: "VIEW_FILE" | "DOWNLOAD_FILE";
    attachment: AttachmentRecord;
    userId: string;
    userName: string;
    email: string;
    request: RequestLike;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: "ATTACHMENT",
        entityId: input.attachment.id,
        ipAddress: extractIpAddress(input.request),
        userAgent: input.request.headers["user-agent"] ?? null,
        metadata: {
          description:
            input.action === "VIEW_FILE"
              ? `Consultation du fichier ${input.attachment.fileName}`
              : `Telechargement du fichier ${input.attachment.fileName}`,
          userName: input.userName,
          email: input.email,
          documentId: input.attachment.documentId,
          documentReference: input.attachment.document.reference,
          fileId: input.attachment.id,
          fileName: input.attachment.fileName,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  private async ensureBucket() {
    if (this.bucketReady) {
      return;
    }

    const bucket = process.env.MINIO_BUCKET ?? "sigeda-documents";
    const exists = await this.client.bucketExists(bucket);

    if (!exists) {
      await this.client.makeBucket(bucket, process.env.MINIO_REGION ?? "us-east-1");
    }

    this.bucketReady = true;
  }
}

function canAccessDocumentAttachment(user: ScopedUser, attachment: AttachmentRecord) {
  if (["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(user.role.code)) {
    return true;
  }

  const userScope = resolveDepartmentScope(user.department);
  const authorScope = resolveDepartmentScope(attachment.document.author.department);
  const archiveBureauIds = uniqueStrings(attachment.document.archives.map((archive) => archive.bureauId));

  if (user.role.code === "DIRECTEUR") {
    return userScope.directionId === attachment.document.emitterDirectionId;
  }

  if (user.role.code === "MANAGER") {
    return Boolean(userScope.serviceId && userScope.serviceId === authorScope.serviceId);
  }

  return Boolean(userScope.bureauId && archiveBureauIds.includes(userScope.bureauId));
}

function canAccessArchiveAnnotation(user: ScopedUser, annotation: ArchiveAnnotationRecord) {
  if (["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(user.role.code)) {
    return true;
  }

  const userScope = resolveDepartmentScope(user.department);

  if (!userScope.directionId) {
    return false;
  }

  return (
    annotation.documentArchive.folder.ownerDirectionId === userScope.directionId ||
    annotation.documentArchive.document.emitterDirectionId === userScope.directionId ||
    annotation.documentArchive.document.recipients.some((recipient) => recipient.directionId === userScope.directionId) ||
    annotation.documentArchive.bureauId === userScope.bureauId
  );
}

function buildUserName(user: ScopedUser) {
  return [user.nom, user.prenom].filter(Boolean).join(" ").trim() || user.email;
}

function extractIpAddress(request: RequestLike) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.ip ?? null;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sanitizeDispositionFileName(fileName: string) {
  return sanitizeFileName(fileName).replace(/"/g, "");
}

function buildObjectKey(documentId: string, originalFileName: string) {
  return `documents/${documentId}/${randomUUID()}-${sanitizeFileName(originalFileName)}`;
}

function buildArchiveAnnotationObjectKey(archiveId: string, originalFileName: string) {
  return `archive-annotations/${archiveId}/${randomUUID()}-${sanitizeFileName(originalFileName)}`;
}

function buildDocumentAnnotationObjectKey(documentId: string, originalFileName: string) {
  return `document-annotations/${documentId}/${randomUUID()}-${sanitizeFileName(originalFileName)}`;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function canAccessDocumentAnnotation(user: ScopedUser, annotation: DocumentAnnotationRecord) {
  if (["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(user.role.code)) {
    return true;
  }

  const userScope = resolveDepartmentScope(user.department);

  if (!userScope.directionId) {
    return false;
  }

  return (
    annotation.document.emitterDirectionId === userScope.directionId ||
    annotation.document.recipients.some((recipient) => recipient.directionId === userScope.directionId) ||
    annotation.document.archives.some(
      (archive) => archive.folder.ownerDirectionId === userScope.directionId || archive.bureauId === userScope.bureauId
    )
  );
}

type RequestLike = {
  headers: Record<string, string | string[] | undefined> & {
    "user-agent"?: string;
    "x-forwarded-for"?: string;
  };
  ip?: string;
};
