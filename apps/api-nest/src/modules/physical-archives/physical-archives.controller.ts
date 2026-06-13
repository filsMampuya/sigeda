import { Body, Controller, Get, GoneException, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { PhysicalArchivesService } from "./physical-archives.service.js";
import { ListPhysicalArchivesQueryDto } from "./dto/list-physical-archives-query.dto.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("physical-archives")
export class PhysicalArchivesController {
  constructor(private readonly physicalArchives: PhysicalArchivesService) {}

  @Get()
  list(@Query() query: ListPhysicalArchivesQueryDto, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.physicalArchives.list(query, principal);
  }

  @Post()
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT")
  create(
    @Body()
    body: {
      documentArchiveId: string;
      documentId: string;
      partnerDirectionId?: string;
      site: string;
      batiment: string;
      salle: string;
      rayon: string;
      etagere: string;
      classeur: string;
      dossier: string;
      boiteArchive: string;
    }
  ) {
    void body;
    throw new GoneException(
      "Le classement manuel des archives physiques est desactive. Le classement est desormais determine automatiquement par les classeurs."
    );
  }
}
