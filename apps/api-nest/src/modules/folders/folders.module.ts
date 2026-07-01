import { Module } from "@nestjs/common";
import { FoldersController } from "./folders.controller.js";
import { FoldersService } from "./folders.service.js";
import { DepartmentsModule } from "../departments/departments.module.js";
import { DocumentTypesModule } from "../document-types/document-types.module.js";

@Module({
  imports: [DepartmentsModule, DocumentTypesModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService]
})
export class FoldersModule {}
