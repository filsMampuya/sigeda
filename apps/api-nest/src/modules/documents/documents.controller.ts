import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { DocumentsService } from "./documents.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list() {
    return this.documents.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.documents.get(id);
  }

  @Post()
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  create(@Body() body: Parameters<DocumentsService["create"]>[0]) {
    return this.documents.create(body);
  }
}
