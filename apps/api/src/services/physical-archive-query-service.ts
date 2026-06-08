import type {
  ArchiveFolder,
  AuthenticatedUser,
  Departement,
  DocumentArchive,
  DocumentEntity,
  PaginatedResult,
  PhysicalArchive,
  PhysicalArchiveListItem
} from "@sigeda/shared/types";

import { AuthorizationService } from "./authorization-service";
import { normalizeFolderStatus } from "./archive-folder-helpers";
import { paginateItems, parsePagination } from "./pagination";

type PhysicalArchiveRepositoryLike = {
  list: () => Promise<PhysicalArchive[]>;
};

type DocumentArchiveRepositoryLike = {
  list: () => Promise<DocumentArchive[]>;
};

type DocumentRepositoryLike = {
  list: () => Promise<DocumentEntity[]>;
};

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
};

type ArchiveFolderRepositoryLike = {
  list: () => Promise<ArchiveFolder[]>;
};

export class PhysicalArchiveQueryService {
  constructor(
    private readonly physicalArchiveRepository: PhysicalArchiveRepositoryLike,
    private readonly documentArchiveRepository: DocumentArchiveRepositoryLike,
    private readonly documentRepository: DocumentRepositoryLike,
    private readonly archiveFolderRepository: ArchiveFolderRepositoryLike,
    private readonly departementRepository: DepartementRepositoryLike,
    private readonly authorizationService: AuthorizationService
  ) {}

  async listForUser(query: Record<string, unknown>, user?: AuthenticatedUser): Promise<PaginatedResult<PhysicalArchiveListItem>> {
    if (!user) {
      return paginateItems([], 1, 10);
    }

    const [physicalArchives, documentArchives, documents, archiveFolders, departements] = await Promise.all([
      this.physicalArchiveRepository.list(),
      this.documentArchiveRepository.list(),
      this.documentRepository.list(),
      this.archiveFolderRepository.list(),
      this.departementRepository.list()
    ]);

    const documentArchiveMap = new Map(documentArchives.map((archive) => [archive.id, archive]));
    const documentMap = new Map(documents.map((document) => [document.id, document]));
    const departementMap = new Map(departements.map((departement) => [departement.id, departement]));
    const archiveFolderMap = new Map(archiveFolders.map((folder) => [folder.id, folder]));

    const rows = physicalArchives
      .map((archive) =>
        toPhysicalArchiveListItem(archive, documentArchiveMap, documentMap, departementMap, archiveFolderMap)
      )
      .filter((archive): archive is PhysicalArchiveListItem => archive !== null)
      .filter((archive) => {
        const document = documentMap.get(archive.documentId);
        return Boolean(document && this.authorizationService.canAccessDocument(user, document));
      });

    let scopedRows = rows;

    if (user.directionId) {
      const directionScopedRows = rows.filter(
        (archive) => !archive.directionId || archive.directionId === user.directionId
      );
      if (
        user.role !== "ADMIN" &&
        user.role !== "DIRECTION_GENERALE" &&
        user.role !== "AUDITEUR" &&
        directionScopedRows.length > 0
      ) {
        const filtered = sortPhysicalArchives(applyPhysicalArchiveFilters(directionScopedRows, query));
        const { page, pageSize } = parsePagination(query);
        return paginateItems(filtered, page, pageSize);
      }
      scopedRows = directionScopedRows.length > 0 ? directionScopedRows : rows;
    }

    const filtered = sortPhysicalArchives(applyPhysicalArchiveFilters(scopedRows, query));
    const { page, pageSize } = parsePagination(query);
    return paginateItems(filtered, page, pageSize);
  }
}

function toPhysicalArchiveListItem(
  archive: PhysicalArchive,
  documentArchiveMap: Map<string, DocumentArchive>,
  documentMap: Map<string, DocumentEntity>,
  departementMap: Map<string, Departement>,
  archiveFolderMap: Map<string, ArchiveFolder>
): PhysicalArchiveListItem | null {
  const document = documentMap.get(archive.documentId);

  if (!document) {
    return null;
  }

  const documentArchive = archive.documentArchiveId ? documentArchiveMap.get(archive.documentArchiveId) : null;
  const direction = archive.directionId ? departementMap.get(archive.directionId) : undefined;
  const partnerDirection = archive.partnerDirectionId ? departementMap.get(archive.partnerDirectionId) : undefined;
  const bureau = documentArchive?.bureauId ? departementMap.get(documentArchive.bureauId) : undefined;
  const archiveFolder = archive.folderId ? archiveFolderMap.get(archive.folderId) : undefined;
  const partnerDirectionIds = documentArchive?.movementType === "SORTIE"
    ? [...document.receiverDirectionIds, ...document.copyDirectionIds]
    : [document.emitterDirectionId].filter((value): value is string => Boolean(value));

  return {
    ...archive,
    documentReference: document.numeroReference,
    documentTitle: document.title ?? document.subject ?? document.fileName ?? document.numeroReference,
    bureauId: documentArchive?.bureauId,
    directionCode: direction?.code,
    directionName: direction?.designation,
    bureauCode: bureau?.code,
    bureauName: bureau?.designation,
    partnerDirectionCode: partnerDirection?.code,
    partnerDirectionName: partnerDirection?.designation,
    partnerDirectionCodes: partnerDirectionIds
      .map((directionId) => departementMap.get(directionId)?.code)
      .filter((value): value is string => Boolean(value)),
    partnerDirectionNames: partnerDirectionIds
      .map((directionId) => departementMap.get(directionId)?.designation)
      .filter((value): value is string => Boolean(value)),
    documentStatus: document.status,
    folderStatus: normalizeFolderStatus(archiveFolder?.status)
  };
}

function sortPhysicalArchives(rows: PhysicalArchiveListItem[]) {
  return [...rows].sort((left, right) => {
    if (left.section === right.section) {
      if (left.section === "SORTIE") {
        return Number.parseInt(right.classementKey ?? "0", 10) - Number.parseInt(left.classementKey ?? "0", 10);
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }

    return left.section === "SORTIE" ? -1 : 1;
  });
}

function applyPhysicalArchiveFilters(rows: PhysicalArchiveListItem[], query: Record<string, unknown>) {
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
        row.classeur.toLowerCase().includes(searchTerm) ||
        (row.partnerDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        (row.bureauName ?? "").toLowerCase().includes(searchTerm)) &&
      (!year || row.year === year) &&
      (!directionId || row.directionId === directionId) &&
      (!partnerDirectionId || row.partnerDirectionId === partnerDirectionId) &&
      (!section || row.section === section)
    );
  });
}
