import { Injectable } from "@nestjs/common";
import { MovementType } from "@sigeda/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { FoldersService } from "../folders/folders.service.js";
import { DepartmentsService } from "../departments/departments.service.js";

@Injectable()
export class DocumentArchivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly departments: DepartmentsService
  ) {}

  list() {
    return this.prisma.documentArchive.findMany({
      include: { document: true, folder: true, bureau: true, archivedBy: true },
      orderBy: { archivedAt: "desc" }
    });
  }

  async syncForCreatedDocument(input: {
    documentId: string;
    year: number;
    bureauId: string;
    emitterDirectionId: string;
    receiverDirectionIds: string[];
    copyDirectionIds: string[];
    archivedById: string;
  }) {
    const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);
    const partners = Array.from(new Set([...input.receiverDirectionIds, ...input.copyDirectionIds].filter(Boolean)));

    if (ownerDirection.id === input.emitterDirectionId) {
      return this.createArchives(input, ownerDirection.id, partners, "SORTIE");
    }

    if (partners.includes(ownerDirection.id)) {
      return this.createArchives(input, ownerDirection.id, [input.emitterDirectionId], "ENTREE");
    }

    return [];
  }

  private async createArchives(
    input: {
      documentId: string;
      year: number;
      bureauId: string;
      archivedById: string;
    },
    ownerDirectionId: string,
    partnerDirectionIds: string[],
    movementType: MovementType
  ) {
    const archives = [];

    for (const partnerDirectionId of partnerDirectionIds) {
      const folder = await this.folders.ensure({
        year: input.year,
        bureauId: input.bureauId,
        ownerDirectionId,
        partnerDirectionId
      });

      archives.push(
        await this.prisma.documentArchive.upsert({
          where: {
            documentId_bureauId_folderId_movementType: {
              documentId: input.documentId,
              bureauId: input.bureauId,
              folderId: folder.id,
              movementType
            }
          },
          update: {},
          create: {
            documentId: input.documentId,
            bureauId: input.bureauId,
            folderId: folder.id,
            movementType,
            archivedById: input.archivedById
          }
        })
      );
    }

    return archives;
  }
}
