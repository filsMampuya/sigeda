import { Module } from "@nestjs/common";
import { DocumentArchivesController } from "./document-archives.controller.js";
import { DocumentArchivesService } from "./document-archives.service.js";
import { FoldersModule } from "../folders/folders.module.js";
import { DepartmentsModule } from "../departments/departments.module.js";
import { AttachmentsModule } from "../attachments/attachments.module.js";

@Module({
  imports: [FoldersModule, DepartmentsModule, AttachmentsModule],
  controllers: [DocumentArchivesController],
  providers: [DocumentArchivesService],
  exports: [DocumentArchivesService]
})
export class DocumentArchivesModule {}
