import type { DocumentEntity } from "@sigeda/shared/types";
import type { AuthenticatedUser } from "@sigeda/shared/types";

import { BaseCrudService } from "./base-crud-service";
import { AuthorizationService } from "./authorization-service";
import { DocumentStorageService } from "./document-storage-service";
import { OcrService } from "./ocr-service";

export class DocumentService extends BaseCrudService<DocumentEntity> {
  constructor(
    repository: {
      list: () => Promise<DocumentEntity[]>;
      getById: (id: string) => Promise<DocumentEntity | null>;
      upsert: (entity: DocumentEntity) => Promise<DocumentEntity>;
    },
    private readonly authorizationService: AuthorizationService,
    private readonly storageService: DocumentStorageService,
    private readonly ocrService: OcrService
  ) {
    super(repository);
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

  async search(
    query: Record<string, unknown>,
    user?: AuthenticatedUser
  ) {
    const documents = await this.listForUser(user);
    const searchTerm = typeof query.q === "string" ? query.q.toLowerCase() : "";
    const directionId = typeof query.directionId === "string" ? query.directionId : undefined;
    const serviceId = typeof query.serviceId === "string" ? query.serviceId : undefined;
    const bureauId = typeof query.bureauId === "string" ? query.bureauId : undefined;
    const status = typeof query.status === "string" ? query.status : undefined;

    return documents.filter((document) => {
      const matchesText =
        !searchTerm ||
        document.reference.toLowerCase().includes(searchTerm) ||
        document.title.toLowerCase().includes(searchTerm) ||
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
      fileUrl: storedFile.fileUrl,
      filePath: storedFile.filePath,
      mimeType: storedFile.mimeType,
      fileSizeBytes: storedFile.fileSizeBytes,
      originalFileName: storedFile.originalFileName,
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
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async validate(id: string) {
    return this.update(id, {
      status: "VALIDE",
      updatedAt: new Date().toISOString()
    });
  }

  async reject(id: string) {
    return this.update(id, {
      status: "REJETE",
      updatedAt: new Date().toISOString()
    });
  }
}
