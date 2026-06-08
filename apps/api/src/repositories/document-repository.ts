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
      throw new Error("Firestore is not configured for collection documents.");
    }

    await this.ensureSeeded();
    const canonicalSnapshot = await this.db.collection("documents").get();

    if (!canonicalSnapshot.empty) {
      return canonicalSnapshot.docs.map((doc) => normalizeDocument(doc.data()));
    }

    const legacySnapshot = await this.db.collection("Document").get();
    return legacySnapshot.docs.map((doc) => mapLegacyDocument(doc.data() as Record<string, unknown>));
  }

  async getById(id: string) {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection documents.");
    }

    await this.ensureSeeded();
    const canonicalSnapshot = await this.db.collection("documents").doc(id).get();

    if (canonicalSnapshot.exists) {
      return normalizeDocument(canonicalSnapshot.data());
    }

    const legacySnapshot = await this.db.collection("Document").doc(id).get();
    return legacySnapshot.exists ? mapLegacyDocument(legacySnapshot.data() as Record<string, unknown>) : null;
  }

  async upsert(entity: DocumentEntity) {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection documents.");
    }

    await this.db.collection("documents").doc(entity.id).set(removeUndefinedDeep(entity), { merge: true });
    return entity;
  }

  private async ensureSeeded() {
    if (!this.db || this.seedData.length === 0) {
      return;
    }

    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        const canonicalCollection = this.db!.collection("documents");
        const existingCanonical = await canonicalCollection.limit(1).get();

        if (!existingCanonical.empty) {
          return;
        }

        const legacyDocuments = await this.db!.collection("Document").limit(1).get();

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
  const emitterDirectionId =
    typeof record.emitterDirectionId === "string"
      ? record.emitterDirectionId
      : typeof record.directionId === "string"
        ? record.directionId
        : undefined;
  const reference = typeof record.reference === "string" ? record.reference : String(record.numeroReference ?? "");
  const referenceYear = resolveDocumentYear(record);
  const parsedReference = parseReference(reference);

  return {
    id: String(record.id),
    numeroReference: String(record.numeroReference ?? record.reference ?? ""),
    year: typeof record.year === "number" ? record.year : referenceYear,
    referenceNumber:
      typeof record.referenceNumber === "number" ? record.referenceNumber : parsedReference.referenceNumber,
    referenceCode:
      typeof record.referenceCode === "string" && record.referenceCode
        ? record.referenceCode
        : parsedReference.referenceCode,
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
    reference,
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
    fileUrl:
      typeof record.fileUrl === "string"
        ? record.fileUrl
        : typeof record.urlFileName === "string"
          ? record.urlFileName
          : undefined,
    title: typeof record.title === "string" ? record.title : undefined,
    subject: typeof record.subject === "string" ? record.subject : undefined,
    description: typeof record.description === "string" ? record.description : undefined,
    summary: typeof record.summary === "string" ? record.summary : undefined,
    directionId: typeof record.directionId === "string" ? record.directionId : undefined,
    serviceId: typeof record.serviceId === "string" ? record.serviceId : undefined,
    bureauId: typeof record.bureauId === "string" ? record.bureauId : undefined,
    authorId: typeof record.authorId === "string" ? record.authorId : undefined,
    authorName: typeof record.authorName === "string" ? record.authorName : undefined,
    signerId: typeof record.signerId === "string" ? record.signerId : undefined,
    signerName: typeof record.signerName === "string" ? record.signerName : undefined,
    emitterDirectionId,
    receiverDirectionIds: Array.isArray(record.receiverDirectionIds)
      ? (record.receiverDirectionIds as string[])
      : [],
    copyDirectionIds: Array.isArray(record.copyDirectionIds) ? (record.copyDirectionIds as string[]) : [],
    confidentialityLevel: record.confidentialityLevel as DocumentEntity["confidentialityLevel"],
    status: record.status as DocumentEntity["status"],
    keywords: Array.isArray(record.keywords) ? (record.keywords as string[]) : [],
    physicalArchiveId: typeof record.physicalArchiveId === "string" ? record.physicalArchiveId : undefined,
    version: typeof record.version === "number" ? record.version : 1,
    attachments: Array.isArray(record.attachments) ? (record.attachments as DocumentEntity["attachments"]) : [],
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
    archivedAt: typeof record.archivedAt === "string" ? record.archivedAt : undefined,
    filePath: typeof record.filePath === "string" ? record.filePath : undefined,
    aiExtractedData:
      record.aiExtractedData && typeof record.aiExtractedData === "object"
        ? (record.aiExtractedData as DocumentEntity["aiExtractedData"])
        : undefined
  };
}

function normalizeDocument(record: Record<string, unknown> | undefined): DocumentEntity {
  if (!record) {
    throw new Error("Invalid Document record.");
  }

  return {
    ...mapLegacyDocument(record),
    numeroReference: String(record.numeroReference ?? ""),
    year: typeof record.year === "number" ? record.year : resolveDocumentYear(record),
    dateCreation: String(record.dateCreation ?? record.createdAt ?? new Date().toISOString()),
    type: String(record.type ?? "AUTRE"),
    dateDerniereModication: String(
      record.dateDerniereModication ?? record.updatedAt ?? record.createdAt ?? new Date().toISOString()
    )
  };
}

function resolveDocumentYear(record: Record<string, unknown>) {
  const rawDate =
    typeof record.createdAt === "string"
      ? record.createdAt
      : typeof record.dateCreation === "string"
        ? record.dateCreation
        : new Date().toISOString();
  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
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

function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, removeUndefinedDeep(entryValue)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}
