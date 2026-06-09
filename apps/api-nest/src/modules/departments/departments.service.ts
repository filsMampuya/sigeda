import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DepartmentType } from "@sigeda/database";
import { PrismaService } from "../prisma/prisma.service.js";

type CreateDepartmentInput = {
  code: string;
  designation: string;
  type: DepartmentType;
  parentId?: string | null;
};

const requiredParentType: Partial<Record<DepartmentType, DepartmentType>> = {
  DIRECTION: "DIRECTION_GENERALE",
  SERVICE: "DIRECTION",
  BUREAU: "SERVICE"
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
    const existing = await this.prisma.department.findUnique({ where: { code: input.code } });

    if (existing) {
      throw new ConflictException("Department code already exists.");
    }

    await this.assertParent(input.type, input.parentId);

    return this.prisma.department.create({
      data: {
        code: input.code.trim().toUpperCase(),
        designation: input.designation.trim(),
        type: input.type,
        parentId: input.parentId ?? null
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

    const ownerDirection = bureau.parent?.parent;

    if (!ownerDirection || !["DIRECTION", "DIRECTION_GENERALE"].includes(ownerDirection.type)) {
      throw new BadRequestException("Direction proprietaire introuvable pour ce bureau.");
    }

    return ownerDirection;
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
    const expectedType = requiredParentType[type];

    if (!parent || parent.type !== expectedType) {
      throw new BadRequestException(`${type} parent must be ${expectedType}.`);
    }
  }
}
