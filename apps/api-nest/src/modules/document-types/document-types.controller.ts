import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { CreateDocumentTypeDto } from "./dto/create-document-type.dto.js";
import { DocumentTypesService } from "./document-types.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("document-types")
export class DocumentTypesController {
  constructor(private readonly documentTypes: DocumentTypesService) {}

  @Get()
  list(@Query("includeInactive") includeInactive?: string) {
    return this.documentTypes.list({
      includeInactive: includeInactive === "true"
    });
  }

  @Post()
  @Roles("ADMIN", "DIRECTEUR_GENERAL")
  create(@Body() body: CreateDocumentTypeDto) {
    return this.documentTypes.create(body);
  }
}
