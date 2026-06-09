import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { DocumentArchivesService } from "./document-archives.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("document-archives")
export class DocumentArchivesController {
  constructor(private readonly archives: DocumentArchivesService) {}

  @Get()
  list() {
    return this.archives.list();
  }
}
