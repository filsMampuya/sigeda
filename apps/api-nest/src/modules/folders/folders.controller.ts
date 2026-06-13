import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import { FoldersService } from "./folders.service.js";
import { CreateFolderDto, UpdateFolderStatusDto } from "./dto/folder.dto.js";
import { ListFoldersQueryDto } from "./dto/list-folders-query.dto.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("folders")
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  list(@Query() query: ListFoldersQueryDto, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.folders.list(query, principal);
  }

  @Get(":id/documents")
  getDocuments(@Param("id") id: string, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.folders.getDocuments(id, principal);
  }

  @Post()
  @Roles("ADMIN", "DIRECTEUR", "MANAGER", "AGENT")
  create(
    @Body() body: CreateFolderDto,
    @CurrentUser() principal: AuthenticatedPrincipal
  ) {
    return this.folders.createManual(principal, body);
  }

  @Post(":id/status")
  @Roles("ADMIN", "DIRECTEUR", "MANAGER")
  updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateFolderStatusDto
  ) {
    return this.folders.updateStatus(id, body.status);
  }
}
