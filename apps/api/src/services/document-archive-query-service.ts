import type {
  ArchiveFolder,
  AuthenticatedUser,
  Departement,
  DocumentArchive,
  DocumentArchiveListItem,
  DocumentEntity,
  PaginatedResult
} from "@sigeda/shared/types";

import { AuthorizationService } from "./authorization-service";
import { normalizeFolderStatus, parseFolderId } from "./archive-folder-helpers";
import { paginateItems, parsePagination } from "./pagination";

type DocumentArchiveRepositoryLike = {
  list: () => Promise<DocumentArchive[]>;
};

type ArchiveFolderRepositoryLike = {
  list: () => Promise<ArchiveFolder[]>;
};

type DocumentRepositoryLike = {
  list: () => Promise<DocumentEntity[]>;
};

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
};

export class DocumentArchiveQueryService {
  constructor(
    private readonly archiveFolderRepository: ArchiveFolderRepositoryLike,
    private readonly archiveRepository: DocumentArchiveRepositoryLike,
    private readonly documentRepository: DocumentRepositoryLike,
    private readonly departementRepository: DepartementRepositoryLike,
    private readonly authorizationService: AuthorizationService
  ) {}

  async listForUser(query: Record<string, unknown>, user?: AuthenticatedUser): Promise<PaginatedResult<DocumentArchiveListItem>> {
    if (!user) {
      return paginateItems([], 1, 10);
    }

    const [folders, archives, documents, departements] = await Promise.all([
      this.archiveFolderRepository.list(),
      this.archiveRepository.list(),
      this.documentRepository.list(),
      this.departementRepository.list()
    ]);

    const documentMap = new Map(documents.map((document) => [document.id, document]));
    const departementMap = new Map(departements.map((departement) => [departement.id, departement]));
    const folderMap = new Map(folders.map((folder) => [folder.id, folder]));

    const rows = archives
      .map((archive) => toArchiveListItem(archive, documentMap, departementMap, folderMap))
      .filter(isDocumentArchiveListItem)
      .filter((archive) => {
        const document = documentMap.get(archive.documentId);
        return Boolean(document && this.authorizationService.canAccessDocument(user, document));
      });

    const scopedRows =
      (user.role === "DIRECTEUR" || user.role === "CHEF_SERVICE" || user.role === "CHEF_BUREAU" || user.role === "AGENT") &&
      user.directionId
        ? rows.filter((archive) => (archive.ownerDirectionId ?? archive.directionId) === user.directionId)
        : rows;

    const filtered = sortArchives(applyArchiveFilters(scopedRows, query));
    const { page, pageSize } = parsePagination(query);
    return paginateItems(filtered, page, pageSize);
  }
}

function toArchiveListItem(
  archive: DocumentArchive,
  documentMap: Map<string, DocumentEntity>,
  departementMap: Map<string, Departement>,
  folderMap: Map<string, ArchiveFolder>
): DocumentArchiveListItem | null {
  const document = documentMap.get(archive.documentId);

  if (!document) {
    return null;
  }

  const ownerDirectionId = archive.ownerDirectionId ?? archive.directionId;
  const currentDirection = ownerDirectionId ? departementMap.get(ownerDirectionId) : undefined;
  const folderMeta = archive.folderId ? parseFolderId(archive.folderId) : null;
  const partnerDirectionIds = folderMeta?.partnerDirectionId
    ? [folderMeta.partnerDirectionId]
    : archive.movementType === "SORTIE"
      ? [...document.receiverDirectionIds, ...document.copyDirectionIds]
      : [document.emitterDirectionId].filter((value): value is string => Boolean(value));

  return {
    ...archive,
    ownerDirectionId,
    directionId: ownerDirectionId,
    documentReference: document.numeroReference,
    documentTitle: document.title ?? document.subject ?? document.fileName ?? document.numeroReference,
    referenceNumber: document.referenceNumber,
    emitterDirectionCode: document.emitterDirectionId
      ? departementMap.get(document.emitterDirectionId)?.code
      : document.direction.code,
    emitterDirectionName: document.emitterDirectionId
      ? departementMap.get(document.emitterDirectionId)?.designation
      : document.direction.designation,
    currentDirectionCode: currentDirection?.code,
    currentDirectionName: currentDirection?.designation,
    folderStatus: normalizeFolderStatus(archive.folderId ? folderMap.get(archive.folderId)?.status : undefined),
    partnerDirectionIds,
    partnerDirectionCodes: partnerDirectionIds
      .map((directionId) => departementMap.get(directionId)?.code)
      .filter((value): value is string => Boolean(value)),
    partnerDirectionNames: partnerDirectionIds
      .map((directionId) => departementMap.get(directionId)?.designation)
      .filter((value): value is string => Boolean(value)),
    documentCreatedAt: String(document.createdAt),
    documentStatus: document.status,
    confidentialityLevel: document.confidentialityLevel
  } satisfies DocumentArchiveListItem;
}

function sortArchives(rows: DocumentArchiveListItem[]) {
  return [...rows].sort((left, right) => {
    if (left.movementType === right.movementType) {
      if (left.movementType === "SORTIE") {
        return (right.referenceNumber ?? 0) - (left.referenceNumber ?? 0);
      }

      return new Date(right.documentCreatedAt).getTime() - new Date(left.documentCreatedAt).getTime();
    }

    return left.movementType === "SORTIE" ? -1 : 1;
  });
}

function isDocumentArchiveListItem(
  archive: DocumentArchiveListItem | null
): archive is DocumentArchiveListItem {
  return archive !== null;
}

function applyArchiveFilters(rows: DocumentArchiveListItem[], query: Record<string, unknown>) {
  const searchTerm = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
  const year = typeof query.year === "string" ? Number.parseInt(query.year, 10) : undefined;
  const directionId = typeof query.directionId === "string" ? query.directionId : undefined;
  const partnerDirectionId = typeof query.partnerDirectionId === "string" ? query.partnerDirectionId : undefined;
  const section = typeof query.section === "string" ? query.section : undefined;

  return rows.filter((row) => {
    return (
      (!searchTerm ||
        row.documentReference.toLowerCase().includes(searchTerm) ||
        row.documentTitle.toLowerCase().includes(searchTerm) ||
        (row.currentDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        row.partnerDirectionNames.some((value) => value.toLowerCase().includes(searchTerm))) &&
      (!year || row.year === year) &&
      (!directionId || (row.ownerDirectionId ?? row.directionId) === directionId) &&
      (!partnerDirectionId || row.partnerDirectionIds.includes(partnerDirectionId)) &&
      (!section || row.movementType === section)
    );
  });
}
