import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { Roles } from "../auth/roles.decorator.js";
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

  @Get(":id")
  get(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.archives.get(id, principal);
  }

  @Post(":id/classify")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  classify(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.archives.classify(id, principal);
  }
}
