import type { AuditLog, AuthenticatedUser, Departement, DocumentEntity, PaginatedResult, User } from "@sigeda/shared/types";
import { randomUUID } from "node:crypto";

import { HttpError } from "../errors/http-error";
import { paginateItems, parsePagination } from "./pagination";
import { AuthorizationService } from "./authorization-service";
import { DocumentArchiveService } from "./document-archive-service";
import { DocumentStorageService } from "./document-storage-service";
import { OcrService } from "./ocr-service";

type DocumentRepositoryLike = {
  list: () => Promise<DocumentEntity[]>;
  getById: (id: string) => Promise<DocumentEntity | null>;
  upsert: (entity: DocumentEntity) => Promise<DocumentEntity>;
};

type DepartementRepositoryLike = {
  getById: (id: string) => Promise<Departement | null>;
};

type UserRepositoryLike = {
  getById: (id: string) => Promise<User | null>;
};

type AuditLogServiceLike = {
  create: (entity: Omit<AuditLog, "id">) => Promise<AuditLog>;
};

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepositoryLike,
    private readonly departementRepository: DepartementRepositoryLike,
    private readonly userRepository: UserRepositoryLike,
    private readonly authorizationService: AuthorizationService,
    private readonly storageService: DocumentStorageService,
    private readonly ocrService: OcrService,
    private readonly auditLogService: AuditLogServiceLike,
    private readonly documentArchiveService: DocumentArchiveService
  ) {}

  list() {
    return this.repository.list();
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  async create(input: Record<string, unknown>, user?: AuthenticatedUser) {
    const entity = await this.normalizeDocumentInput(input, user);
    await this.ensureAnnualReferenceUniqueness(entity);
    return this.repository.upsert(entity);
  }

  async createFromUpload(input: Record<string, unknown>, file: Express.Multer.File, authenticatedUser?: AuthenticatedUser) {
    if (!authenticatedUser?.id) {
      throw new HttpError(401, "Authentification requise.");
    }

    const profile = await this.userRepository.getById(authenticatedUser.id);

    if (!profile) {
      throw new HttpError(400, "Utilisateur introuvable dans la collection users.");
    }

    if (!profile.personne.nom || !profile.personne.prenom || !profile.matricule) {
      throw new HttpError(400, "Profil utilisateur incomplet (nom, prenom ou matricule manquant).");
    }

    const type = getString(input.type);
    const numeroReference = getString(input.numeroReference).trim();
    const explicitYear = getNumber(input.year);
    const receiverDirectionIds = getStringArray(input.receiverDirectionIds);
    const copyDirectionIds = getStringArray(input.copyDirectionIds);
    const emitterDirectionId = profile.directionId ?? getString(input.emitterDirectionId) ?? getString(input.directionId);
    const subject = getString(input.subject) || undefined;
    const description = getString(input.description) || undefined;
    const summary = getString(input.summary) || undefined;
    const signerName = getString(input.signerName) || undefined;
    const confidentialityLevel = getString(input.confidentialityLevel) as DocumentEntity["confidentialityLevel"];
    const keywords = getStringArray(input.keywords);

    if (!numeroReference) {
      throw new HttpError(400, "Le numero de reference est obligatoire.");
    }

    if (!type) {
      throw new HttpError(400, "Le type du document est obligatoire.");
    }

    if (!emitterDirectionId) {
      throw new HttpError(400, "La direction emettrice doit etre resolue depuis le profil utilisateur.");
    }

    const direction = await this.departementRepository.getById(emitterDirectionId);

    if (!direction) {
      throw new HttpError(400, "La direction emettrice est introuvable.");
    }

    if (direction.type !== "Direction" && direction.type !== "Direction Generale") {
      throw new HttpError(400, "La direction emettrice doit etre de type Direction ou Direction Generale.");
    }

    await this.assertDirectionList(receiverDirectionIds, "destinataire");
    await this.assertDirectionList(copyDirectionIds, "copie");

    const documentId = randomUUID();
    const storedFile = await this.storageService.save(documentId, file, profile.matricule);

    const extraction = await this.ocrService.extract(file, storedFile.fileKind);

    const timestamp = Date.now();
    const year = explicitYear ?? new Date(timestamp).getFullYear();
    const parsedReference = parseReference(numeroReference);
    const entity: DocumentEntity = {
      id: documentId,
      numeroReference,
      year,
      referenceNumber: parsedReference.referenceNumber,
      referenceCode: parsedReference.referenceCode || direction.code,
      dateCreation: timestamp,
      user: {
        id: profile.id,
        nom: profile.personne.nom,
        prenom: profile.personne.prenom,
        matricule: profile.matricule,
        email: profile.email
      },
      type,
      direction: {
        id: direction.id,
        code: direction.code,
        designation: direction.designation
      },
      dateDerniereModication: timestamp,
      reference: numeroReference,
      fileName: file.originalname,
      urlFileName: storedFile.fileUrl,
      title: file.originalname,
      subject,
      description,
      summary,
      directionId: direction.id,
      authorId: profile.id,
      authorName: `${profile.personne.nom} ${profile.personne.prenom}`.trim(),
      signerName,
      emitterDirectionId: direction.id,
      receiverDirectionIds,
      copyDirectionIds,
      confidentialityLevel,
      status: "BROUILLON",
      keywords,
      version: 1,
      attachments: [],
      originalFileName: storedFile.originalFileName,
      mimeType: storedFile.mimeType,
      fileSizeBytes: storedFile.fileSizeBytes,
      storageProvider: storedFile.storageProvider,
      fileUrl: storedFile.fileUrl,
      filePath: storedFile.filePath,
      fileKind: storedFile.fileKind,
      digitizationStatus:
        storedFile.fileKind === "IMAGE" || storedFile.fileKind === "PDF"
          ? extraction.ocrStatus === "COMPLETED"
            ? "DIGITIZED"
            : "FAILED"
          : "UPLOADED",
      ocrStatus: extraction.ocrStatus,
      ocrText: extraction.ocrText,
      ocrExtractedAt: extraction.ocrExtractedAt,
      aiExtractedData: {
        reference: numeroReference,
        year,
        referenceNumber: parsedReference.referenceNumber,
        referenceCode: parsedReference.referenceCode || direction.code,
        subject,
        emitterDirectionId: direction.id,
        receiverDirectionIds,
        copyDirectionIds,
        documentType: type,
        signerName,
        confidentialityLevel,
        summary,
        keywords
      },
      createdAt: new Date(timestamp).toISOString(),
      updatedAt: new Date(timestamp).toISOString()
    };

    await this.ensureAnnualReferenceUniqueness(entity);
    const saved = await this.repository.upsert(entity);
    await this.documentArchiveService.syncArchives(saved, profile.id);

    await this.auditLogService.create({
      userId: profile.id,
      userName: `${profile.personne.nom} ${profile.personne.prenom}`.trim(),
      action: "CREATE_DOCUMENT",
      entityType: "Document",
      entityId: saved.id,
      description: `Creation du document ${saved.numeroReference}`,
      createdAt: new Date().toISOString()
    });

    return saved;
  }

  async update(id: string, patch: Partial<DocumentEntity>) {
    const existing = await this.repository.getById(id);

    if (!existing) {
      throw new Error("Document not found.");
    }

    const receiverDirectionIds = patch.receiverDirectionIds
      ? uniqueStrings(patch.receiverDirectionIds)
      : existing.receiverDirectionIds;
    const copyDirectionIds = patch.copyDirectionIds ? uniqueStrings(patch.copyDirectionIds) : existing.copyDirectionIds;
    const emitterDirectionId = patch.emitterDirectionId ?? existing.emitterDirectionId ?? existing.directionId;
    const year = patch.year ?? existing.year;
    const nextReference = patch.numeroReference ?? patch.reference ?? existing.numeroReference;
    const parsedReference = parseReference(nextReference);
    const nextEntity: DocumentEntity = {
      ...existing,
      ...patch,
      id,
      numeroReference: nextReference,
      year,
      referenceNumber: patch.referenceNumber ?? parsedReference.referenceNumber,
      referenceCode: patch.referenceCode ?? parsedReference.referenceCode ?? existing.referenceCode,
      emitterDirectionId,
      directionId: emitterDirectionId ?? existing.directionId,
      receiverDirectionIds,
      copyDirectionIds,
      reference: patch.reference ?? patch.numeroReference ?? existing.reference ?? existing.numeroReference,
      attachments: patch.attachments ?? existing.attachments ?? [],
      fileUrl: patch.fileUrl ?? patch.urlFileName ?? existing.fileUrl ?? existing.urlFileName,
      dateDerniereModication: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.ensureAnnualReferenceUniqueness(nextEntity, id);
    const saved = await this.repository.upsert(nextEntity);
    await this.documentArchiveService.syncArchives(saved, saved.authorId ?? saved.user.id ?? "SYSTEM");
    return saved;
  }

  async listForUser(user?: AuthenticatedUser) {
    const documents = await this.list();
    if (!user) {
      return [];
    }
    return this.authorizationService.filterDocuments(user, documents);
  }

  async getByIdForUser(id: string, user?: AuthenticatedUser) {
    if (!user) {
      return null;
    }

    const document = await this.getById(id);
    if (!document) {
      return null;
    }

    return this.authorizationService.canAccessDocument(user, document) ? document : null;
  }

  async search(query: Record<string, unknown>, user?: AuthenticatedUser) {
    const documents = await this.listForUser(user);
    const searchTerm = typeof query.q === "string" ? query.q.toLowerCase() : "";
    const directionId = typeof query.directionId === "string" ? query.directionId : undefined;
    const serviceId = typeof query.serviceId === "string" ? query.serviceId : undefined;
    const bureauId = typeof query.bureauId === "string" ? query.bureauId : undefined;
    const status = typeof query.status === "string" ? query.status : undefined;
    const year = typeof query.year === "string" ? Number.parseInt(query.year, 10) : undefined;

    return documents.filter((document) => {
      const title = document.title ?? document.fileName ?? "";
      const matchesText =
        !searchTerm ||
        document.numeroReference.toLowerCase().includes(searchTerm) ||
        title.toLowerCase().includes(searchTerm) ||
        document.keywords.some((keyword) => keyword.toLowerCase().includes(searchTerm));

      return (
        matchesText &&
        (!directionId || document.directionId === directionId) &&
        (!serviceId || document.serviceId === serviceId) &&
        (!bureauId || document.bureauId === bureauId) &&
        (!status || document.status === status) &&
        (!year || document.year === year)
      );
    });
  }

  async searchPaginated(query: Record<string, unknown>, user?: AuthenticatedUser): Promise<PaginatedResult<DocumentEntity>> {
    const items = await this.search(query, user);
    const { page, pageSize } = parsePagination(query);
    return paginateItems(items, page, pageSize);
  }

  async searchRecent(query: Record<string, unknown>, user?: AuthenticatedUser): Promise<PaginatedResult<DocumentEntity>> {
    const documents = await this.listForUser(user);
    const sorted = documents.sort((a, b) => {
      const dateA = new Date(a.createdAt ?? a.dateCreation).getTime();
      const dateB = new Date(b.createdAt ?? b.dateCreation).getTime();
      return dateB - dateA;
    });
    const { page, pageSize } = parsePagination(query);
    return paginateItems(sorted, page, pageSize);
  }

  async uploadSourceFile(id: string, file: Express.Multer.File) {
    const existing = await this.getById(id);

    if (!existing) {
      throw new Error("Document not found.");
    }

    const storedFile = await this.storageService.save(id, file);
    const ocrResult = await this.ocrService.extract(file, storedFile.fileKind);

    return this.update(id, {
      urlFileName: storedFile.fileUrl,
      fileUrl: storedFile.fileUrl,
      filePath: storedFile.filePath,
      fileName: storedFile.originalFileName,
      originalFileName: storedFile.originalFileName,
      mimeType: storedFile.mimeType,
      fileSizeBytes: storedFile.fileSizeBytes,
      storageProvider: storedFile.storageProvider,
      fileKind: storedFile.fileKind,
      digitizationStatus:
        storedFile.fileKind === "IMAGE" || storedFile.fileKind === "PDF"
          ? ocrResult.ocrStatus === "COMPLETED"
            ? "DIGITIZED"
            : "FAILED"
          : "UPLOADED",
      ocrStatus: ocrResult.ocrStatus,
      ocrText: ocrResult.ocrText,
      ocrExtractedAt: ocrResult.ocrExtractedAt
    });
  }

  async archive(id: string) {
    const archived = await this.update(id, {
      status: "ARCHIVE",
      archivedAt: new Date().toISOString()
    });
    await this.documentArchiveService.syncArchives(archived, archived.authorId ?? archived.user.id ?? "SYSTEM");
    return archived;
  }

  async validate(id: string) {
    return this.update(id, {
      status: "VALIDE"
    });
  }

  async reject(id: string) {
    return this.update(id, {
      status: "REJETE"
    });
  }

  private async normalizeDocumentInput(input: Record<string, unknown>, authenticatedUser?: AuthenticatedUser) {
    const emitterDirectionId =
      authenticatedUser?.directionId ||
      getString(input.emitterDirectionId) ||
      getString(input.directionId) ||
      getString((input.direction as Record<string, unknown> | undefined)?.id);
    const serviceId = getString(input.serviceId);
    const bureauId = getString(input.bureauId);
    const receiverDirectionIds = getStringArray(input.receiverDirectionIds);
    const copyDirectionIds = getStringArray(input.copyDirectionIds);

    const directionDepartement = emitterDirectionId ? await this.departementRepository.getById(emitterDirectionId) : null;
    const userProfile = await this.resolveUserProfile(getString(input.authorId), authenticatedUser);
    const timestamp = new Date().toISOString();
    const reference = getString(input.numeroReference) || getString(input.reference);
    const normalizedYear = getNumber(input.year) ?? new Date(timestamp).getFullYear();
    const parsedReference = parseReference(reference);
    const authorName =
      [userProfile?.personne.nom, userProfile?.personne.prenom].filter(Boolean).join(" ").trim() ||
      authenticatedUser?.displayName ||
      undefined;

    return {
      id: randomUUID(),
      numeroReference: reference,
      year: normalizedYear,
      referenceNumber: getNumber(input.referenceNumber) ?? parsedReference.referenceNumber,
      referenceCode: getString(input.referenceCode) || parsedReference.referenceCode || directionDepartement?.code || "REF",
      dateCreation: timestamp,
      user: {
        id: userProfile?.id ?? authenticatedUser?.id,
        nom:
          (userProfile?.personne.nom ?? getString((input.user as Record<string, unknown> | undefined)?.nom)) ||
          deriveNom(authenticatedUser?.displayName),
        prenom:
          (userProfile?.personne.prenom ??
            getString((input.user as Record<string, unknown> | undefined)?.prenom)) ||
          derivePrenom(authenticatedUser?.displayName),
        matricule:
          (userProfile?.matricule ??
            getString((input.user as Record<string, unknown> | undefined)?.matricule)) ||
          getString(input.authorId) ||
          authenticatedUser?.id ||
          "INCONNU",
        email: userProfile?.email ?? authenticatedUser?.email
      },
      type: getString(input.type) || getString(input.documentType),
      direction: {
        id: (directionDepartement?.id ?? emitterDirectionId) || undefined,
        code:
          directionDepartement?.code ??
          getString((input.direction as Record<string, unknown> | undefined)?.code) ??
          emitterDirectionId,
        designation:
          directionDepartement?.designation ??
          getString((input.direction as Record<string, unknown> | undefined)?.designation) ??
          emitterDirectionId
      },
      dateDerniereModication: timestamp,
      reference,
      fileName: getString(input.fileName) || getString(input.title) || undefined,
      urlFileName: getString(input.urlFileName) || undefined,
      fileUrl: getString(input.fileUrl) || getString(input.urlFileName) || undefined,
      title: getString(input.title) || undefined,
      subject: getString(input.subject) || undefined,
      description: getString(input.description) || undefined,
      summary: getString(input.summary) || undefined,
      directionId: directionDepartement?.type === "Direction" ? directionDepartement.id : emitterDirectionId || undefined,
      serviceId: serviceId || undefined,
      bureauId: bureauId || undefined,
      authorId: getString(input.authorId) || authenticatedUser?.id,
      authorName,
      signerId: getString(input.signerId) || undefined,
      signerName: getString(input.signerName) || undefined,
      emitterDirectionId: directionDepartement?.id ?? (emitterDirectionId || undefined),
      receiverDirectionIds,
      copyDirectionIds,
      confidentialityLevel: getString(input.confidentialityLevel) as DocumentEntity["confidentialityLevel"],
      status: (getString(input.status) || "BROUILLON") as DocumentEntity["status"],
      keywords: getStringArray(input.keywords),
      version: getNumber(input.version) ?? 1,
      attachments: Array.isArray(input.attachments) ? (input.attachments as DocumentEntity["attachments"]) : [],
      filePath: getString(input.filePath) || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      aiExtractedData:
        input.aiExtractedData && typeof input.aiExtractedData === "object"
          ? ({
              ...(input.aiExtractedData as DocumentEntity["aiExtractedData"]),
              year: normalizedYear,
              referenceNumber: getNumber(input.referenceNumber) ?? parsedReference.referenceNumber,
              referenceCode:
                getString(input.referenceCode) || parsedReference.referenceCode || directionDepartement?.code || "REF"
            } as DocumentEntity["aiExtractedData"])
          : undefined
    } satisfies DocumentEntity;
  }

  private async resolveUserProfile(authorId?: string, authenticatedUser?: AuthenticatedUser) {
    const userId = authorId || authenticatedUser?.id;

    if (!userId) {
      return null;
    }

    return this.userRepository.getById(userId);
  }

  private async assertDirectionList(directionIds: string[], label: string) {
    for (const directionId of directionIds) {
      const direction = await this.departementRepository.getById(directionId);

      if (!direction || (direction.type !== "Direction" && direction.type !== "Direction Generale")) {
        throw new HttpError(400, `La direction ${label} ${directionId} est invalide.`);
      }
    }
  }

  private async ensureAnnualReferenceUniqueness(document: DocumentEntity, currentDocumentId?: string) {
    const emitterDirectionId = document.emitterDirectionId ?? document.directionId;

    if (!emitterDirectionId) {
      throw new HttpError(400, "La direction emettrice est obligatoire pour verifier l'unicite annuelle.");
    }

    const documents = await this.repository.list();
    const duplicate = documents.find((candidate) => {
      if (candidate.id === currentDocumentId || candidate.id === document.id) {
        return false;
      }

      const sameDirection = (candidate.emitterDirectionId ?? candidate.directionId) === emitterDirectionId;
      const sameYear = candidate.year === document.year;
      const sameReference = candidate.numeroReference.trim().toUpperCase() === document.numeroReference.trim().toUpperCase();
      const sameReferenceNumber = candidate.referenceNumber === document.referenceNumber;

      return sameDirection && sameYear && (sameReference || sameReferenceNumber);
    });

    if (duplicate) {
      throw new HttpError(
        409,
        `La reference ${document.numeroReference} existe deja pour cette direction emettrice sur l'annee ${document.year}.`
      );
    }
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

function parseReference(reference: string) {
  const trimmed = reference.trim();
  const match = trimmed.match(/^(.*?)(\d+)\s*$/);

  if (!match) {
    return {
      referenceCode: trimmed || "REF",
      referenceNumber: 0
    };
  }

  return {
    referenceCode: match[1].replace(/[-\s]+$/, "") || trimmed,
    referenceNumber: Number.parseInt(match[2], 10)
  };
}

function getStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return uniqueStrings(value.filter((entry): entry is string => typeof entry === "string"));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return uniqueStrings(parsed.filter((entry): entry is string => typeof entry === "string"));
      }
    } catch {
      return uniqueStrings(
        trimmed
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      );
    }
  }

  return [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function deriveNom(displayName?: string) {
  if (!displayName) {
    return "Utilisateur";
  }

  return displayName.split(" ").filter(Boolean)[0] ?? "Utilisateur";
}

function derivePrenom(displayName?: string) {
  if (!displayName) {
    return "";
  }

  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(1)
    .join(" ");
}
