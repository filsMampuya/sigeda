import type {
  ArchiveFolder,
  ArchiveFolderListItem,
  AuthenticatedUser,
  Departement,
  DocumentArchive,
  PaginatedResult,
  PhysicalArchive
} from "@sigeda/shared/types";
import { normalizeFolderStatus, parseFolderId } from "./archive-folder-helpers";
import { paginateItems, parsePagination } from "./pagination";

type ArchiveFolderRepositoryLike = {
  list: () => Promise<ArchiveFolder[]>;
};

type DocumentArchiveRepositoryLike = {
  list: () => Promise<DocumentArchive[]>;
};

type PhysicalArchiveRepositoryLike = {
  list: () => Promise<PhysicalArchive[]>;
};

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
};

export class ArchiveFolderQueryService {
  constructor(
    private readonly archiveFolderRepository: ArchiveFolderRepositoryLike,
    private readonly documentArchiveRepository: DocumentArchiveRepositoryLike,
    private readonly physicalArchiveRepository: PhysicalArchiveRepositoryLike,
    private readonly departementRepository: DepartementRepositoryLike
  ) {}

  async listForUser(query: Record<string, unknown>, user?: AuthenticatedUser): Promise<PaginatedResult<ArchiveFolderListItem>> {
    if (!user) {
      return paginateItems([], 1, 10);
    }

    const [archiveFolders, documentArchives, physicalArchives, departements] = await Promise.all([
      this.archiveFolderRepository.list(),
      this.documentArchiveRepository.list(),
      this.physicalArchiveRepository.list(),
      this.departementRepository.list()
    ]);

    const scopedArchives = scopeDocumentArchives(documentArchives, user);
    const physicalByFolderId = new Map<string, PhysicalArchive[]>();
    for (const archive of physicalArchives) {
      if (!archive.folderId) {
        continue;
      }
      const rows = physicalByFolderId.get(archive.folderId) ?? [];
      rows.push(archive);
      physicalByFolderId.set(archive.folderId, rows);
    }

    const departementMap = new Map(departements.map((departement) => [departement.id, departement]));
    const archiveFolderMap = new Map(archiveFolders.map((folder) => [folder.id, folder]));
    const folders = aggregateFolders(scopedArchives, physicalByFolderId, departementMap, archiveFolderMap);

    const filtered = applyFolderFilters(folders, query);
    const { page, pageSize } = parsePagination(query);
    return paginateItems(filtered, page, pageSize);
  }
}

function scopeDocumentArchives(documentArchives: DocumentArchive[], user: AuthenticatedUser) {
  if (user.role === "ADMIN" || user.role === "DIRECTION_GENERALE" || user.role === "AUDITEUR") {
    return documentArchives;
  }

  if (!user.directionId) {
    return [];
  }

  return documentArchives.filter((archive) => (archive.ownerDirectionId ?? archive.directionId) === user.directionId);
}

function aggregateFolders(
  documentArchives: DocumentArchive[],
  physicalByFolderId: Map<string, PhysicalArchive[]>,
  departementMap: Map<string, Departement>,
  archiveFolderMap: Map<string, ArchiveFolder>
) {
  const folders = new Map<string, ArchiveFolderListItem>();

  for (const archive of documentArchives) {
    const folderId = archive.folderId ?? archive.archiveFolderId;

    if (!folderId) {
      continue;
    }

    const existing = folders.get(folderId);
    const folderMeta = parseFolderId(folderId);
    const physicalRows = physicalByFolderId.get(folderId) ?? [];
    const latestPhysical = physicalRows
      .map((row) => row.updatedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

    const persistedFolder = archiveFolderMap.get(folderId);

    if (existing) {
      existing.archiveCount += 1;
      existing.latestArchivedAt = latestDate(existing.latestArchivedAt, archive.archivedAt, latestPhysical);
      existing.status = normalizeFolderStatus(persistedFolder?.status ?? existing.status);
      continue;
    }

    folders.set(folderId, {
      id: folderId,
      year: archive.year,
      bureauId: archive.bureauId ?? "NO_BUREAU",
      ownerDirectionId: archive.ownerDirectionId ?? archive.directionId ?? folderMeta.ownerDirectionId,
      directionId: archive.ownerDirectionId ?? archive.directionId ?? folderMeta.ownerDirectionId,
      partnerDirectionId: folderMeta.partnerDirectionId,
      section: archive.movementType,
      createdAt: archive.archivedAt,
      status: normalizeFolderStatus(persistedFolder?.status),
      ownerDirectionCode: departementMap.get(archive.ownerDirectionId ?? archive.directionId ?? folderMeta.ownerDirectionId)?.code,
      ownerDirectionName: departementMap.get(archive.ownerDirectionId ?? archive.directionId ?? folderMeta.ownerDirectionId)?.designation,
      partnerDirectionCode: departementMap.get(folderMeta.partnerDirectionId)?.code,
      partnerDirectionName: departementMap.get(folderMeta.partnerDirectionId)?.designation,
      bureauCode: departementMap.get(archive.bureauId ?? "")?.code,
      bureauName: departementMap.get(archive.bureauId ?? "")?.designation,
      accessibleBureauCodes: (persistedFolder?.accessibleBureauIds ?? [archive.bureauId ?? ""])
        .map((bureauId) => departementMap.get(bureauId)?.code)
        .filter((value): value is string => Boolean(value)),
      accessibleBureauNames: (persistedFolder?.accessibleBureauIds ?? [archive.bureauId ?? ""])
        .map((bureauId) => departementMap.get(bureauId)?.designation)
        .filter((value): value is string => Boolean(value)),
      archiveCount: 1,
      latestArchivedAt: latestDate(undefined, archive.archivedAt, latestPhysical)
    });
  }

  for (const persistedFolder of archiveFolderMap.values()) {
    if (folders.has(persistedFolder.id)) {
      continue;
    }

    const folderMeta = parseFolderId(persistedFolder.id);

    folders.set(persistedFolder.id, {
      ...persistedFolder,
      status: normalizeFolderStatus(persistedFolder.status),
      section: folderMeta.legacySection,
      ownerDirectionCode: departementMap.get(persistedFolder.ownerDirectionId ?? persistedFolder.directionId ?? "")?.code,
      ownerDirectionName: departementMap.get(persistedFolder.ownerDirectionId ?? persistedFolder.directionId ?? "")?.designation,
      partnerDirectionCode: departementMap.get(persistedFolder.partnerDirectionId)?.code,
      partnerDirectionName: departementMap.get(persistedFolder.partnerDirectionId)?.designation,
      bureauCode: departementMap.get(persistedFolder.bureauId)?.code,
      bureauName: departementMap.get(persistedFolder.bureauId)?.designation,
      accessibleBureauCodes: (persistedFolder.accessibleBureauIds ?? [persistedFolder.bureauId])
        .map((bureauId) => departementMap.get(bureauId)?.code)
        .filter((value): value is string => Boolean(value)),
      accessibleBureauNames: (persistedFolder.accessibleBureauIds ?? [persistedFolder.bureauId])
        .map((bureauId) => departementMap.get(bureauId)?.designation)
        .filter((value): value is string => Boolean(value)),
      archiveCount: 0,
      latestArchivedAt: undefined
    });
  }

  return Array.from(folders.values()).sort((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year;
    }

    if (left.section !== right.section) {
      return left.section === "SORTIE" ? -1 : 1;
    }

    return (right.latestArchivedAt ?? "").localeCompare(left.latestArchivedAt ?? "");
  });
}

function applyFolderFilters(folders: ArchiveFolderListItem[], query: Record<string, unknown>) {
  const searchTerm = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
  const year = typeof query.year === "string" ? Number.parseInt(query.year, 10) : undefined;
  const directionId = typeof query.directionId === "string" ? query.directionId : undefined;
  const partnerDirectionId = typeof query.partnerDirectionId === "string" ? query.partnerDirectionId : undefined;
  const section = typeof query.section === "string" ? query.section : undefined;
  const status = typeof query.status === "string" ? query.status : undefined;

  return folders.filter((folder) => {
    return (
      (!searchTerm ||
        folder.id.toLowerCase().includes(searchTerm) ||
        (folder.ownerDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        (folder.partnerDirectionName ?? "").toLowerCase().includes(searchTerm) ||
        (folder.bureauName ?? "").toLowerCase().includes(searchTerm)) &&
      (!year || folder.year === year) &&
      (!directionId || (folder.ownerDirectionId ?? folder.directionId) === directionId) &&
      (!partnerDirectionId || folder.partnerDirectionId === partnerDirectionId) &&
      (!section || folder.section === section) &&
      (!status || folder.status === status)
    );
  });
}

function latestDate(...values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}
