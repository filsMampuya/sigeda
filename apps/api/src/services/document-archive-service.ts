import type { Departement, DocumentArchive, DocumentEntity } from "@sigeda/shared/types";
import { ArchiveFolderService } from "./archive-folder-service";
import { buildFolderId, resolveArchivePlan } from "./archive-folder-helpers";

type DocumentArchiveRepositoryLike = {
  list: () => Promise<DocumentArchive[]>;
  upsert: (entity: DocumentArchive) => Promise<DocumentArchive>;
  delete: (id: string) => Promise<void>;
};

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
};

export class DocumentArchiveService {
  constructor(
    private readonly repository: DocumentArchiveRepositoryLike,
    private readonly departementRepository: DepartementRepositoryLike,
    private readonly archiveFolderService: ArchiveFolderService
  ) {}

  async syncArchives(document: DocumentEntity, archivedBy: string) {
    const desiredArchives = await this.buildDesiredArchives(document, archivedBy);
    const existingArchives = (await this.repository.list()).filter((archive) => archive.documentId === document.id);
    const desiredIds = new Set(desiredArchives.map((archive) => archive.id));

    for (const archive of desiredArchives) {
      if (archive.folderId) {
        await this.archiveFolderService.ensureFolder({
          id: archive.folderId,
          year: archive.year,
          bureauId: archive.bureauId ?? "NO_BUREAU",
          ownerDirectionId: archive.ownerDirectionId ?? archive.directionId ?? "UNKNOWN_OWNER",
          directionId: archive.directionId ?? archive.ownerDirectionId ?? "UNKNOWN_OWNER",
          partnerDirectionId: parseFolderPartnerDirectionId(archive.folderId),
          createdAt: archive.archivedAt
        });
      }
      await this.repository.upsert(archive);
    }

    for (const archive of existingArchives) {
      if (!desiredIds.has(archive.id)) {
        await this.repository.delete(archive.id);
      }
    }

    return desiredArchives;
  }

  private async buildDesiredArchives(document: DocumentEntity, archivedBy: string): Promise<DocumentArchive[]> {
    const archivedAt = document.archivedAt ?? document.updatedAt ?? new Date().toISOString();
    const departements = await this.departementRepository.list();
    const plan = resolveArchivePlan(document, departements);

    if (!plan) {
      return [];
    }

    return plan.partnerDirectionIds.map((partnerDirectionId) => {
      const folderId = buildFolderId({
        year: document.year,
        bureauId: plan.bureauId,
        ownerDirectionId: plan.ownerDirectionId,
        partnerDirectionId
      });

      return {
        id: buildArchiveId(document.id, plan.bureauId, plan.movementType, partnerDirectionId),
        year: document.year,
        documentId: document.id,
        ownerDirectionId: plan.ownerDirectionId,
        directionId: plan.ownerDirectionId,
        serviceId: document.serviceId,
        bureauId: plan.bureauId,
        folderId,
        movementType: plan.movementType,
        archivedAt,
        archivedBy,
        archiveFolderId: folderId
      } satisfies DocumentArchive;
    });
  }
}

function buildArchiveId(documentId: string, bureauId: string, movementType: string, partnerDirectionId: string) {
  return `${documentId}__${bureauId}__${movementType}__${partnerDirectionId}`;
}

function parseFolderPartnerDirectionId(folderId: string) {
  const parts = folderId.split("__");
  return parts[3] ?? "UNKNOWN_PARTNER";
}
