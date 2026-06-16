import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { UsersService } from "./users.service.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import { CurrentUser } from "../../shared/current-user.decorator.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { ListUsersQueryDto } from "./dto/list-users-query.dto.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT", "AUDITEUR")
  list(@Query() query: ListUsersQueryDto, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.users.list(query, principal);
  }

  @Get(":id")
  @Roles("ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AGENT", "AUDITEUR")
  get(@Param("id") id: string, @CurrentUser() principal: AuthenticatedPrincipal) {
    return this.users.get(id, principal);
  }

  @Post()
  @Roles("ADMIN")
  create(@Body() body: CreateUserDto) {
    return this.users.create(body);
  }
}
