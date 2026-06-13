import { Module } from "@nestjs/common";
import { PhysicalArchivesController } from "./physical-archives.controller.js";
import { PhysicalArchivesService } from "./physical-archives.service.js";

@Module({
  controllers: [PhysicalArchivesController],
  providers: [PhysicalArchivesService],
  exports: [PhysicalArchivesService]
})
export class PhysicalArchivesModule {}
