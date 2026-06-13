import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { SearchService } from "./search.service.js";
import { SearchDocumentsQueryDto } from "./dto/search-documents-query.dto.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("index-plan")
  indexPlan() {
    return this.search.indexPlan();
  }

  @Get("documents")
  documents(@Query() query: SearchDocumentsQueryDto, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.search.searchDocuments(query, principal);
  }
}
