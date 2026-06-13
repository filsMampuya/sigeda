import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import { DocumentArchivesService } from "./document-archives.service.js";
import { ListDocumentArchivesQueryDto } from "./dto/list-document-archives-query.dto.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("document-archives")
export class DocumentArchivesController {
  constructor(private readonly archives: DocumentArchivesService) {}

  @Get()
  list(@Query() query: ListDocumentArchivesQueryDto, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.archives.list(query, principal);
  }
}
