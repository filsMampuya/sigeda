import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { DashboardService } from "./dashboard.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("stats")
  stats(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.dashboard.getStats(principal);
  }
}
