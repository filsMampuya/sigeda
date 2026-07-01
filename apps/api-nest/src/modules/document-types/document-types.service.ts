import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { DocumentTypeOption } from "@sigeda/shared/types";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(options?: { includeInactive?: boolean }) {
    const rows = await this.prisma.documentType.findMany({
      where: options?.includeInactive ? undefined : { isActive: true },
      orderBy: [{ label: "asc" }, { code: "asc" }]
    });

    return rows.map(mapDocumentType);
  }

  async create(input: {
    code: string;
    label: string;
    description?: string;
    isActive?: boolean;
  }) {
    const code = input.code.trim().toUpperCase();
    const label = input.label.trim();

    if (!code) {
      throw new BadRequestException("Le code du type documentaire est obligatoire.");
    }

    if (!label) {
      throw new BadRequestException("Le libelle du type documentaire est obligatoire.");
    }

    const existing = await this.prisma.documentType.findUnique({
      where: { code }
    });

    if (existing) {
      throw new ConflictException("Un type documentaire avec ce code existe deja.");
    }

    const created = await this.prisma.documentType.create({
      data: {
        code,
        label,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true
      }
    });

    return mapDocumentType(created);
  }

  async resolveActiveDocumentTypes(documentTypeIds: string[]) {
    const uniqueIds = Array.from(new Set(documentTypeIds.map((value) => value.trim()).filter(Boolean)));

    if (!uniqueIds.length) {
      return [];
    }

    const rows = await this.prisma.documentType.findMany({
      where: {
        id: {
          in: uniqueIds
        },
        isActive: true
      }
    });

    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException("Un ou plusieurs types documentaires sont introuvables ou inactifs.");
    }

    return rows;
  }

  async resolveDocumentType(input: { documentTypeId?: string; type?: string }) {
    const requestedId = input.documentTypeId?.trim();

    if (requestedId) {
      const byId = await this.prisma.documentType.findFirst({
        where: {
          id: requestedId,
          isActive: true
        }
      });

      if (!byId) {
        throw new BadRequestException("Le type documentaire selectionne est introuvable ou inactif.");
      }

      return byId;
    }

    const normalizedType = input.type?.trim().toUpperCase();

    if (!normalizedType) {
      return null;
    }

    return this.prisma.documentType.findFirst({
      where: {
        code: normalizedType,
        isActive: true
      }
    });
  }
}

function mapDocumentType(row: {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DocumentTypeOption {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
