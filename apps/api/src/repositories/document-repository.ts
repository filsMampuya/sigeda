import type { Firestore } from "firebase-admin/firestore";
import type { DocumentEntity } from "@sigeda/shared/types";

export class DocumentRepository {
  private seedPromise: Promise<void> | null = null;

  constructor(
    private readonly db: Firestore | null,
    private readonly seedData: DocumentEntity[] = []
  ) {}

  async list() {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection Document.");
    }

    await this.ensureSeeded();
    const canonicalSnapshot = await this.db.collection("Document").get();

    if (!canonicalSnapshot.empty) {
      return canonicalSnapshot.docs.map((doc) => normalizeDocument(doc.data()));
    }

    const legacySnapshot = await this.db.collection("documents").get();
    return legacySnapshot.docs.map((doc) => mapLegacyDocument(doc.data() as Record<string, unknown>));
  }

  async getById(id: string) {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection Document.");
    }

    await this.ensureSeeded();
    const canonicalSnapshot = await this.db.collection("Document").doc(id).get();

    if (canonicalSnapshot.exists) {
      return normalizeDocument(canonicalSnapshot.data());
    }

    const legacySnapshot = await this.db.collection("documents").doc(id).get();
    return legacySnapshot.exists ? mapLegacyDocument(legacySnapshot.data() as Record<string, unknown>) : null;
  }

  async upsert(entity: DocumentEntity) {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection Document.");
    }

    await this.db.collection("Document").doc(entity.id).set(entity, { merge: true });
    return entity;
  }

  private async ensureSeeded() {
    if (!this.db || this.seedData.length === 0) {
      return;
    }

    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        const canonicalCollection = this.db!.collection("Document");
        const existingCanonical = await canonicalCollection.limit(1).get();

        if (!existingCanonical.empty) {
          return;
        }

        const legacyDocuments = await this.db!.collection("documents").limit(1).get();

        if (!legacyDocuments.empty) {
          return;
        }

        const batch = this.db!.batch();

        for (const entity of this.seedData) {
          batch.set(canonicalCollection.doc(entity.id), entity, { merge: true });
        }

        await batch.commit();
      })();
    }

    await this.seedPromise;
  }
}

function mapLegacyDocument(record: Record<string, unknown>): DocumentEntity {
  return {
    id: String(record.id),
    numeroReference: String(record.numeroReference ?? record.reference ?? ""),
    dateCreation: String(record.dateCreation ?? record.createdAt ?? new Date().toISOString()),
    user:
      typeof record.user === "object" && record.user
        ? {
            id: typeof (record.user as Record<string, unknown>).id === "string" ? String((record.user as Record<string, unknown>).id) : undefined,
            nom: String((record.user as Record<string, unknown>).nom ?? ""),
            prenom: String((record.user as Record<string, unknown>).prenom ?? ""),
            matricule: String((record.user as Record<string, unknown>).matricule ?? record.authorId ?? "INCONNU"),
            email:
              typeof (record.user as Record<string, unknown>).email === "string"
                ? String((record.user as Record<string, unknown>).email)
                : undefined
          }
        : {
            id: typeof record.authorId === "string" ? String(record.authorId) : undefined,
            nom: typeof record.authorId === "string" ? String(record.authorId) : "Utilisateur",
            prenom: "",
            matricule: typeof record.authorId === "string" ? String(record.authorId) : "INCONNU"
          },
    type: String(record.type ?? record.documentType ?? "AUTRE"),
    direction:
      typeof record.direction === "object" && record.direction
        ? {
            id: typeof (record.direction as Record<string, unknown>).id === "string" ? String((record.direction as Record<string, unknown>).id) : undefined,
            code: String((record.direction as Record<string, unknown>).code ?? record.directionId ?? ""),
            designation: String((record.direction as Record<string, unknown>).designation ?? record.directionId ?? "")
          }
        : {
            id: typeof record.directionId === "string" ? String(record.directionId) : undefined,
            code: typeof record.directionId === "string" ? String(record.directionId) : "",
            designation: typeof record.directionId === "string" ? String(record.directionId) : ""
          },
    dateDerniereModication: String(
      record.dateDerniereModication ?? record.updatedAt ?? record.createdAt ?? new Date().toISOString()
    ),
    fileName:
      typeof record.fileName === "string"
        ? record.fileName
        : typeof record.originalFileName === "string"
          ? record.originalFileName
          : typeof record.title === "string"
            ? record.title
            : undefined,
    urlFileName:
      typeof record.urlFileName === "string"
        ? record.urlFileName
        : typeof record.fileUrl === "string"
          ? record.fileUrl
          : undefined,
    title: typeof record.title === "string" ? record.title : undefined,
    description: typeof record.description === "string" ? record.description : undefined,
    directionId: typeof record.directionId === "string" ? record.directionId : undefined,
    serviceId: typeof record.serviceId === "string" ? record.serviceId : undefined,
    bureauId: typeof record.bureauId === "string" ? record.bureauId : undefined,
    authorId: typeof record.authorId === "string" ? record.authorId : undefined,
    confidentialityLevel: record.confidentialityLevel as DocumentEntity["confidentialityLevel"],
    status: record.status as DocumentEntity["status"],
    keywords: Array.isArray(record.keywords) ? (record.keywords as string[]) : [],
    physicalArchiveId: typeof record.physicalArchiveId === "string" ? record.physicalArchiveId : undefined,
    version: typeof record.version === "number" ? record.version : 1,
    originalFileName: typeof record.originalFileName === "string" ? record.originalFileName : undefined,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
    fileSizeBytes: typeof record.fileSizeBytes === "number" ? record.fileSizeBytes : undefined,
    storageProvider: record.storageProvider as DocumentEntity["storageProvider"],
    fileKind: record.fileKind as DocumentEntity["fileKind"],
    digitizationStatus: record.digitizationStatus as DocumentEntity["digitizationStatus"],
    ocrStatus: record.ocrStatus as DocumentEntity["ocrStatus"],
    ocrText: typeof record.ocrText === "string" ? record.ocrText : undefined,
    ocrExtractedAt: typeof record.ocrExtractedAt === "string" ? record.ocrExtractedAt : undefined,
    createdAt: String(record.createdAt ?? record.dateCreation ?? new Date().toISOString()),
    updatedAt: String(record.updatedAt ?? record.dateDerniereModication ?? record.createdAt ?? new Date().toISOString()),
    archivedAt: typeof record.archivedAt === "string" ? record.archivedAt : undefined
  };
}

function normalizeDocument(record: Record<string, unknown> | undefined): DocumentEntity {
  if (!record) {
    throw new Error("Invalid Document record.");
  }

  return {
    ...mapLegacyDocument(record),
    numeroReference: String(record.numeroReference ?? ""),
    dateCreation: String(record.dateCreation ?? record.createdAt ?? new Date().toISOString()),
    type: String(record.type ?? "AUTRE"),
    dateDerniereModication: String(
      record.dateDerniereModication ?? record.updatedAt ?? record.createdAt ?? new Date().toISOString()
    )
  };
}
