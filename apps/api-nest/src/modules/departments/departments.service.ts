import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DepartmentType } from "@sigeda/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { resolveOwnerDirectionIdFromBureau } from "../../shared/department-scope.js";

type CreateDepartmentInput = {
  code: string;
  designation: string;
  type: DepartmentType;
  parentId?: string | null;
  directionId?: string | null;
  serviceId?: string | null;
};

const requiredParentType: Partial<Record<DepartmentType, DepartmentType>> = {
  DIRECTION: "DIRECTION_GENERALE"
};

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.department.findMany({
      orderBy: [{ type: "asc" }, { code: "asc" }]
    });
  }

  async get(id: string) {
    const department = await this.prisma.department.findUnique({ where: { id } });

    if (!department) {
      throw new NotFoundException("Department not found.");
    }

    return department;
  }

  async create(input: CreateDepartmentInput) {
    const normalizedType = String(input.type ?? "").toUpperCase() as DepartmentType;
    const existing = await this.prisma.department.findUnique({ where: { code: input.code } });

    if (existing) {
      throw new ConflictException("Department code already exists.");
    }

    const normalized = await this.normalizeDepartmentInput({
      ...input,
      type: normalizedType
    });

    return this.prisma.department.create({
      data: {
        code: normalized.code.trim().toUpperCase(),
        designation: normalized.designation.trim(),
        type: normalized.type,
        parentId: normalized.parentId ?? null,
        directionId: normalized.directionId ?? null,
        serviceId: normalized.serviceId ?? null
      }
    });
  }

  async hierarchy() {
    const departments = await this.list();
    const byParent = new Map<string, typeof departments>();
    const roots: typeof departments = [];

    for (const department of departments) {
      if (!department.parentId) {
        roots.push(department);
        continue;
      }

      byParent.set(department.parentId, [...(byParent.get(department.parentId) ?? []), department]);
    }

    const toNode = (department: (typeof departments)[number]): (typeof department) & { children: unknown[] } => ({
      ...department,
      children: (byParent.get(department.id) ?? []).map(toNode)
    });

    return roots.map(toNode);
  }

  async resolveOwnerDirectionFromBureau(bureauId: string) {
    const bureau = await this.prisma.department.findUnique({ where: { id: bureauId }, include: { parent: { include: { parent: true } } } });

    if (!bureau || bureau.type !== "BUREAU") {
      throw new BadRequestException("Bureau invalide.");
    }

    const ownerDirectionId = resolveOwnerDirectionIdFromBureau(bureau);

    if (!ownerDirectionId) {
      throw new BadRequestException("Direction proprietaire introuvable pour ce bureau.");
    }

    const ownerDirection = await this.prisma.department.findUnique({ where: { id: ownerDirectionId } });

    if (!ownerDirection || !["DIRECTION", "DIRECTION_GENERALE"].includes(ownerDirection.type)) {
      throw new BadRequestException("Direction proprietaire introuvable pour ce bureau.");
    }

    return ownerDirection;
  }

  private async normalizeDepartmentInput(input: CreateDepartmentInput) {
    if (input.type === "BUREAU" || input.directionId || input.serviceId) {
      return this.normalizeBureauInput(input);
    }

    await this.assertParent(input.type, input.parentId);

    return {
      ...input,
      directionId: input.type === "SERVICE" ? input.parentId ?? null : null,
      serviceId: null
    };
  }

  private async normalizeBureauInput(input: CreateDepartmentInput) {
    let resolvedDirectionId = input.directionId ?? null;
    let resolvedServiceId = input.serviceId ?? null;
    let resolvedParentId = input.parentId ?? null;

    if (!resolvedDirectionId && resolvedParentId) {
      const parent = await this.prisma.department.findUnique({ where: { id: resolvedParentId } });

      if (!parent) {
        throw new BadRequestException("Parent department not found.");
      }

      if (parent.type === "SERVICE") {
        resolvedServiceId = parent.id;
        resolvedDirectionId = parent.directionId ?? parent.parentId ?? null;
      } else if (parent.type === "DIRECTION" || parent.type === "DIRECTION_GENERALE") {
        resolvedDirectionId = parent.id;
      } else {
        throw new BadRequestException("BUREAU parent must be SERVICE, DIRECTION or DIRECTION_GENERALE.");
      }
    }

    if (!resolvedDirectionId) {
      throw new BadRequestException("Direction is required for BUREAU.");
    }

    const direction = await this.prisma.department.findUnique({ where: { id: resolvedDirectionId } });

    if (!direction || !["DIRECTION", "DIRECTION_GENERALE"].includes(direction.type)) {
      throw new BadRequestException("BUREAU direction must be DIRECTION or DIRECTION_GENERALE.");
    }

    if (resolvedServiceId) {
      const service = await this.prisma.department.findUnique({ where: { id: resolvedServiceId } });

      if (!service || service.type !== "SERVICE") {
        throw new BadRequestException("BUREAU service must be SERVICE.");
      }

      if (service.directionId !== direction.id && service.parentId !== direction.id) {
        throw new BadRequestException("SERVICE parent direction must match bureau direction.");
      }

      return {
        ...input,
        parentId: service.id,
        directionId: direction.id,
        serviceId: service.id
      };
    }

    return {
      ...input,
      parentId: direction.id,
      directionId: direction.id,
      serviceId: null
    };
  }

  private async assertParent(type: DepartmentType, parentId?: string | null) {
    if (type === "DIRECTION_GENERALE") {
      if (parentId) {
        throw new BadRequestException("Direction Generale cannot have a parent.");
      }
      return;
    }

    if (!parentId) {
      throw new BadRequestException("Parent department is required.");
    }

    const parent = await this.prisma.department.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw new BadRequestException("Parent department not found.");
    }

    if (type === "SERVICE") {
      if (!["DIRECTION", "DIRECTION_GENERALE"].includes(parent.type)) {
        throw new BadRequestException("SERVICE parent must be DIRECTION or DIRECTION_GENERALE.");
      }
      return;
    }

    const expectedType = requiredParentType[type];

    if (!expectedType || parent.type !== expectedType) {
      throw new BadRequestException(`${type} parent must be ${expectedType}.`);
    }
  }
}
