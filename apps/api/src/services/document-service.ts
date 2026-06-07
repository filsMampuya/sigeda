import type { AuditLog, AuthenticatedUser, Departement, DocumentEntity, User } from "@sigeda/shared/types";
import { randomUUID } from "node:crypto";

import { HttpError } from "../errors/http-error";
import { AuthorizationService } from "./authorization-service";
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
    private readonly auditLogService: AuditLogServiceLike
  ) {}

  list() {
    return this.repository.list();
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  async create(input: Record<string, unknown>, user?: AuthenticatedUser) {
    const entity = await this.normalizeDocumentInput(input, user);
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
    const directionId = getString(input.directionId);
    const numeroReference = getString(input.numeroReference).trim();

    if (!numeroReference) {
      throw new HttpError(400, "Le numero de reference est obligatoire.");
    }

    if (!type) {
      throw new HttpError(400, "Le type du document est obligatoire.");
    }

    if (!directionId) {
      throw new HttpError(400, "La direction est obligatoire.");
    }

    const direction = await this.departementRepository.getById(directionId);

    if (!direction) {
      throw new HttpError(400, "La direction selectionnee est introuvable.");
    }

    if (direction.type !== "Direction" && direction.type !== "Direction Generale") {
      throw new HttpError(400, "La direction doit etre de type Direction ou Direction Generale.");
    }

    const documentId = randomUUID();
    const storedFile = await this.storageService.save(documentId, file, profile.matricule);

    const extraction = await this.ocrService.extract(file, storedFile.fileKind);

    const timestamp = Date.now();
    const entity: DocumentEntity = {
      id: documentId,
      numeroReference,
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
      fileName: file.originalname,
      urlFileName: storedFile.fileUrl,
      title: file.originalname,
      directionId: direction.id,
      authorId: profile.id,
      status: "BROUILLON",
      keywords: [],
      version: 1,
      originalFileName: storedFile.originalFileName,
      mimeType: storedFile.mimeType,
      fileSizeBytes: storedFile.fileSizeBytes,
      storageProvider: storedFile.storageProvider,
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
      createdAt: new Date(timestamp).toISOString(),
      updatedAt: new Date(timestamp).toISOString()
    };

    const saved = await this.repository.upsert(entity);

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

    const nextEntity: DocumentEntity = {
      ...existing,
      ...patch,
      id,
      dateDerniereModication: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.repository.upsert(nextEntity);
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
        (!status || document.status === status)
      );
    });
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
    return this.update(id, {
      status: "ARCHIVE",
      archivedAt: new Date().toISOString()
    });
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
    const directionId = getString(input.directionId) || getString((input.direction as Record<string, unknown> | undefined)?.id);
    const serviceId = getString(input.serviceId);
    const bureauId = getString(input.bureauId);

    const directionDepartement = directionId ? await this.departementRepository.getById(directionId) : null;
    const userProfile = await this.resolveUserProfile(getString(input.authorId), authenticatedUser);
    const timestamp = new Date().toISOString();

    return {
      id: randomUUID(),
      numeroReference: getString(input.numeroReference) || getString(input.reference),
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
        id: (directionDepartement?.id ?? directionId) || undefined,
        code:
          directionDepartement?.code ??
          getString((input.direction as Record<string, unknown> | undefined)?.code) ??
          directionId,
        designation:
          directionDepartement?.designation ??
          getString((input.direction as Record<string, unknown> | undefined)?.designation) ??
          directionId
      },
      dateDerniereModication: timestamp,
      fileName: getString(input.fileName) || getString(input.title) || undefined,
      urlFileName: getString(input.urlFileName) || undefined,
      title: getString(input.title) || undefined,
      description: getString(input.description) || undefined,
      directionId: directionDepartement?.type === "Direction" ? directionDepartement.id : directionId || undefined,
      serviceId: serviceId || undefined,
      bureauId: bureauId || undefined,
      authorId: getString(input.authorId) || authenticatedUser?.id,
      confidentialityLevel: getString(input.confidentialityLevel) as DocumentEntity["confidentialityLevel"],
      status: (getString(input.status) || "BROUILLON") as DocumentEntity["status"],
      keywords: Array.isArray(input.keywords) ? (input.keywords as string[]) : [],
      version: getNumber(input.version) ?? 1,
      createdAt: timestamp,
      updatedAt: timestamp
    } satisfies DocumentEntity;
  }

  private async resolveUserProfile(authorId?: string, authenticatedUser?: AuthenticatedUser) {
    const userId = authorId || authenticatedUser?.id;

    if (!userId) {
      return null;
    }

    return this.userRepository.getById(userId);
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : null;
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
