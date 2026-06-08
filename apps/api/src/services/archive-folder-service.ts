import type { ArchiveFolder, ArchiveFolderStatus, AuthenticatedUser, AuditLog, Departement } from "@sigeda/shared/types";

import { HttpError } from "../errors/http-error";
import { buildFolderId, resolveOwnerDirectionFromBureau } from "./archive-folder-helpers";

type ArchiveFolderRepositoryLike = {
  list: () => Promise<ArchiveFolder[]>;
  getById: (id: string) => Promise<ArchiveFolder | null>;
  upsert: (entity: ArchiveFolder) => Promise<ArchiveFolder>;
};

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
};

type AuditLogServiceLike = {
  create: (entity: Omit<AuditLog, "id">) => Promise<AuditLog>;
};

type EnsureArchiveFolderInput = {
  id: string;
  year: number;
  bureauId: string;
  ownerDirectionId: string;
  directionId: string;
  partnerDirectionId: string;
  createdAt: string;
};

export class ArchiveFolderService {
  constructor(
    private readonly repository: ArchiveFolderRepositoryLike,
    private readonly departementRepository: DepartementRepositoryLike,
    private readonly auditLogService: AuditLogServiceLike
  ) {}

  list() {
    return this.repository.list();
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  async ensureFolder(input: EnsureArchiveFolderInput) {
    const existing = await this.repository.getById(input.id);

    if (existing) {
      return existing;
    }

    return this.repository.upsert({
      ...input,
      accessibleBureauIds: [input.bureauId],
      status: "ACTIVE"
    });
  }

  async createManualFolder(
    input: {
      year: number;
      bureauId: string;
      partnerDirectionId: string;
      accessibleBureauIds?: string[];
    },
    user?: AuthenticatedUser
  ) {
    const departements = await this.departementRepository.list();
    const ownerDirection = resolveOwnerDirectionFromBureau(input.bureauId, departements);

    if (!ownerDirection) {
      throw new HttpError(400, "Impossible de determiner la direction proprietaire depuis le bureau selectionne.");
    }

    const partnerDirection = departements.find((departement) => departement.id === input.partnerDirectionId);

    if (!partnerDirection || (partnerDirection.type !== "Direction" && partnerDirection.type !== "Direction Generale")) {
      throw new HttpError(400, "La direction partenaire selectionnee est invalide.");
    }

    const normalizedAccessibleBureaux = uniqueStrings([input.bureauId, ...(input.accessibleBureauIds ?? [])]);
    const folderId = buildFolderId({
      year: input.year,
      bureauId: input.bureauId,
      ownerDirectionId: ownerDirection.id,
      partnerDirectionId: input.partnerDirectionId
    });
    const existing = await this.repository.getById(folderId);

    const nextFolder: ArchiveFolder = {
      id: folderId,
      year: input.year,
      bureauId: input.bureauId,
      accessibleBureauIds: uniqueStrings([...(existing?.accessibleBureauIds ?? []), ...normalizedAccessibleBureaux]),
      ownerDirectionId: ownerDirection.id,
      directionId: ownerDirection.id,
      partnerDirectionId: input.partnerDirectionId,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      status: existing?.status ?? "ACTIVE"
    };

    const saved = await this.repository.upsert(nextFolder);

    if (user?.id) {
      await this.auditLogService.create({
        userId: user.id,
        userName: user.displayName || user.email || user.id,
        action: "CREATE_DOCUMENT",
        entityType: "ArchiveFolder",
        entityId: saved.id,
        description: `Creation ou mise a jour du classeur annuel ${saved.id}`,
        createdAt: new Date().toISOString()
      });
    }

    return saved;
  }

  async assertFolderIsWritable(id: string) {
    const folder = await this.repository.getById(id);

    if (!folder) {
      throw new HttpError(404, "Classeur annuel introuvable.");
    }

    if (folder.status === "ARCHIVED") {
      throw new HttpError(409, "Ce classeur annuel est clos et ne peut plus recevoir de nouveaux classements.");
    }

    return folder;
  }

  async updateStatus(id: string, status: ArchiveFolderStatus, user?: AuthenticatedUser) {
    const folder = await this.repository.getById(id);

    if (!folder) {
      throw new HttpError(404, "Classeur annuel introuvable.");
    }

    const updated = await this.repository.upsert({
      ...folder,
      status
    });

    if (user?.id) {
      await this.auditLogService.create({
        userId: user.id,
        userName: user.displayName || user.email || user.id,
        action: "UPDATE_DOCUMENT",
        entityType: "ArchiveFolder",
        entityId: id,
        description: `Statut du classeur annuel ${id} passe a ${status}`,
        createdAt: new Date().toISOString()
      });
    }

    return updated;
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
