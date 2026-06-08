import type {
  AuthenticatedUser,
  DocumentArchive,
  DocumentEntity,
  PhysicalArchive
} from "@sigeda/shared/types";
import { randomUUID } from "node:crypto";

import { HttpError } from "../errors/http-error";
import { ArchiveFolderService } from "./archive-folder-service";
import { buildFolderId as buildArchiveFolderId } from "./archive-folder-helpers";

type PhysicalArchiveRepositoryLike = {
  list: () => Promise<PhysicalArchive[]>;
  upsert: (entity: PhysicalArchive) => Promise<PhysicalArchive>;
};

type DocumentArchiveRepositoryLike = {
  list: () => Promise<DocumentArchive[]>;
  getById: (id: string) => Promise<DocumentArchive | null>;
};

type DocumentRepositoryLike = {
  getById: (id: string) => Promise<DocumentEntity | null>;
};

export class PhysicalArchiveService {
  constructor(
    private readonly repository: PhysicalArchiveRepositoryLike,
    private readonly documentArchiveRepository: DocumentArchiveRepositoryLike,
    private readonly documentRepository: DocumentRepositoryLike,
    private readonly archiveFolderService: ArchiveFolderService
  ) {}

  async list() {
    return this.repository.list();
  }

  async create(
    input: Omit<PhysicalArchive, "id" | "createdAt" | "updatedAt" | "section" | "movementType" | "directionId" | "classementKey">,
    user?: AuthenticatedUser
  ) {
    const documentArchive = await this.documentArchiveRepository.getById(input.documentArchiveId ?? "");

    if (!documentArchive) {
      throw new HttpError(400, "Archive documentaire introuvable.");
    }

    const document = await this.documentRepository.getById(documentArchive.documentId);

    if (!document) {
      throw new HttpError(400, "Document lie introuvable.");
    }

    const partnerDirectionId = this.resolvePartnerDirectionId(document, documentArchive, input.partnerDirectionId);
    const existingArchives = await this.repository.list();
    const duplicate = existingArchives.find(
      (archive) =>
        archive.documentArchiveId === documentArchive.id &&
        archive.partnerDirectionId === partnerDirectionId &&
        archive.year === document.year
    );

    if (duplicate) {
      throw new HttpError(409, "Un classement physique existe deja pour cette archive documentaire, ce partenaire et cette annee.");
    }

    const folderId = buildPhysicalFolderId(documentArchive, document, partnerDirectionId);
    await this.archiveFolderService.ensureFolder({
      id: folderId,
      year: document.year,
      bureauId: documentArchive.bureauId ?? "NO_BUREAU",
      ownerDirectionId: documentArchive.ownerDirectionId ?? documentArchive.directionId ?? "UNKNOWN_OWNER",
      directionId: documentArchive.directionId ?? documentArchive.ownerDirectionId ?? "UNKNOWN_OWNER",
      partnerDirectionId,
      createdAt: documentArchive.archivedAt
    });
    await this.archiveFolderService.assertFolderIsWritable(folderId);

    const timestamp = new Date().toISOString();
    const entity: PhysicalArchive = {
      id: randomUUID(),
      documentArchiveId: documentArchive.id,
      documentId: documentArchive.documentId,
      directionId: documentArchive.directionId,
      partnerDirectionId,
      year: document.year,
      folderId,
      movementType: documentArchive.movementType,
      section: documentArchive.movementType,
      site: input.site,
      batiment: input.batiment,
      salle: input.salle,
      rayon: input.rayon,
      etagere: input.etagere,
      classeur: input.classeur,
      dossier: input.dossier,
      boiteArchive: input.boiteArchive,
      classementKey:
        documentArchive.movementType === "SORTIE"
          ? String(document.referenceNumber)
          : String(document.createdAt),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    return this.repository.upsert(entity);
  }

  private resolvePartnerDirectionId(
    document: DocumentEntity,
    documentArchive: DocumentArchive,
    requestedPartnerDirectionId?: string
  ) {
    const validPartners =
      documentArchive.movementType === "SORTIE"
        ? uniqueStrings([...document.receiverDirectionIds, ...document.copyDirectionIds])
        : [document.emitterDirectionId].filter((value): value is string => Boolean(value));

    if (validPartners.length === 0) {
      return documentArchive.ownerDirectionId ?? documentArchive.directionId ?? "UNKNOWN_PARTNER";
    }

    if (!requestedPartnerDirectionId) {
      if (validPartners.length === 1) {
        return validPartners[0];
      }

      throw new HttpError(400, "Le partenaire directionnel est obligatoire pour ce classement annuel.");
    }

    if (!validPartners.includes(requestedPartnerDirectionId)) {
      throw new HttpError(400, "La direction partenaire selectionnee est invalide pour cette archive.");
    }

    return requestedPartnerDirectionId;
  }
}

function buildPhysicalFolderId(documentArchive: DocumentArchive, document: DocumentEntity, partnerDirectionId: string) {
  return buildArchiveFolderId({
    year: document.year,
    bureauId: documentArchive.bureauId ?? "NO_BUREAU",
    ownerDirectionId: documentArchive.ownerDirectionId ?? documentArchive.directionId ?? "UNKNOWN_OWNER",
    partnerDirectionId
  });
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
