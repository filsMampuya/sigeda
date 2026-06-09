import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { SearchService } from "./search.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("index-plan")
  indexPlan() {
    return this.search.indexPlan();
  }
}
