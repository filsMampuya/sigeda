import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { RecipientKind } from "@sigeda/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { DocumentArchivesService } from "../document-archives/document-archives.service.js";

type CreateDocumentInput = {
  reference: string;
  referenceNumber: number;
  year: number;
  title: string;
  subject?: string;
  summary?: string;
  type: string;
  emitterDirectionId: string;
  receiverDirectionIds: string[];
  copyDirectionIds?: string[];
  bureauId: string;
  authorId: string;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archives: DocumentArchivesService
  ) {}

  list() {
    return this.prisma.document.findMany({
      include: { emitterDirection: true, recipients: { include: { direction: true } }, attachments: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async get(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { emitterDirection: true, recipients: { include: { direction: true } }, archives: true, attachments: true }
    });

    if (!document) {
      throw new NotFoundException("Document not found.");
    }

    return document;
  }

  async create(input: CreateDocumentInput) {
    if (!input.receiverDirectionIds?.length) {
      throw new BadRequestException("At least one receiver direction is required.");
    }

    const duplicate = await this.prisma.document.findUnique({
      where: {
        emitterDirectionId_year_referenceNumber: {
          emitterDirectionId: input.emitterDirectionId,
          year: input.year,
          referenceNumber: input.referenceNumber
        }
      }
    });

    if (duplicate) {
      throw new ConflictException("Reference already exists for this emitter direction and year.");
    }

    const document = await this.prisma.document.create({
      data: {
        reference: input.reference,
        referenceNumber: input.referenceNumber,
        year: input.year,
        title: input.title,
        subject: input.subject,
        summary: input.summary,
        type: input.type,
        emitterDirectionId: input.emitterDirectionId,
        authorId: input.authorId,
        recipients: {
          create: [
            ...input.receiverDirectionIds.map((directionId) => ({ directionId, kind: "RECEIVER" as RecipientKind })),
            ...(input.copyDirectionIds ?? []).map((directionId) => ({ directionId, kind: "COPY" as RecipientKind }))
          ]
        }
      },
      include: { recipients: true }
    });

    await this.archives.syncForCreatedDocument({
      documentId: document.id,
      year: document.year,
      bureauId: input.bureauId,
      emitterDirectionId: input.emitterDirectionId,
      receiverDirectionIds: input.receiverDirectionIds,
      copyDirectionIds: input.copyDirectionIds ?? [],
      archivedById: input.authorId
    });

    return this.get(document.id);
  }
}
