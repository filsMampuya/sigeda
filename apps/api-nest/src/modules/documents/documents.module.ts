import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";
import { DocumentArchivesModule } from "../document-archives/document-archives.module.js";
import { AttachmentsModule } from "../attachments/attachments.module.js";
import { PhysicalArchivesModule } from "../physical-archives/physical-archives.module.js";

@Module({
  imports: [DocumentArchivesModule, AttachmentsModule, PhysicalArchivesModule],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule {}
