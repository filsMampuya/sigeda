import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { DepartmentsService } from "./departments.service.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  list() {
    return this.departments.list();
  }

  @Get("hierarchy")
  hierarchy() {
    return this.departments.hierarchy();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.departments.get(id);
  }

  @Post()
  @Roles("ADMIN")
  create(@Body() body: Parameters<DepartmentsService["create"]>[0]) {
    return this.departments.create(body);
  }
}
