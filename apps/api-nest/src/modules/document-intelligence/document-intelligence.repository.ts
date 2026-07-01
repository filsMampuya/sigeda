import { Injectable } from "@nestjs/common";
import type {
  DocumentIntelligenceJob,
  DocumentIntelligenceJobStatus,
  Prisma
} from "@sigeda/database";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class DocumentIntelligenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.DocumentIntelligenceJobCreateInput) {
    return this.prisma.documentIntelligenceJob.create({ data });
  }

  findById(id: string) {
    return this.prisma.documentIntelligenceJob.findUnique({
      where: { id }
    });
  }

  update(id: string, data: Prisma.DocumentIntelligenceJobUpdateInput) {
    return this.prisma.documentIntelligenceJob.update({
      where: { id },
      data
    });
  }

  async updateStatus(id: string, status: DocumentIntelligenceJobStatus, data?: Prisma.DocumentIntelligenceJobUpdateInput) {
    return this.prisma.documentIntelligenceJob.update({
      where: { id },
      data: {
        status,
        ...data
      }
    });
  }

  async findOwnedByUser(id: string, userId: string): Promise<DocumentIntelligenceJob | null> {
    return this.prisma.documentIntelligenceJob.findFirst({
      where: {
        id,
        userId
      }
    });
  }
}
