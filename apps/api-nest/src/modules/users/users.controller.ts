import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { UsersService } from "./users.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles("ADMIN", "DIRECTEUR_GENERAL")
  list() {
    return this.users.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.users.get(id);
  }

  @Post()
  @Roles("ADMIN")
  create(@Body() body: Parameters<UsersService["create"]>[0]) {
    return this.users.create(body);
  }
}
