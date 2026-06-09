import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { FoldersService } from "./folders.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("folders")
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  list() {
    return this.folders.list();
  }

  @Post()
  @Roles("ADMIN", "DIRECTEUR", "MANAGER", "AGENT")
  create(@Body() body: { year: number; bureauId: string; partnerDirectionId: string }) {
    return this.folders.createManual(body);
  }
}
