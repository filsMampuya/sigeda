import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { DepartmentsService } from "../departments/departments.service.js";

type EnsureFolderInput = {
  year: number;
  bureauId: string;
  ownerDirectionId: string;
  partnerDirectionId: string;
};

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departments: DepartmentsService
  ) {}

  list() {
    return this.prisma.folder.findMany({
      include: { bureau: true, ownerDirection: true, partnerDirection: true },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }]
    });
  }

  async ensure(input: EnsureFolderInput) {
    return this.prisma.folder.upsert({
      where: {
        year_bureauId_ownerDirectionId_partnerDirectionId: input
      },
      update: {},
      create: input
    });
  }

  async createManual(input: { year: number; bureauId: string; partnerDirectionId: string }) {
    const ownerDirection = await this.departments.resolveOwnerDirectionFromBureau(input.bureauId);

    return this.ensure({
      year: input.year,
      bureauId: input.bureauId,
      ownerDirectionId: ownerDirection.id,
      partnerDirectionId: input.partnerDirectionId
    });
  }
}
