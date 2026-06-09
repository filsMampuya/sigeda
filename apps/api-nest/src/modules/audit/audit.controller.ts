import { Controller, Get, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";

@UseGuards(AuthGuard, RolesGuard)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles("ADMIN", "AUDITEUR")
  list() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }
}
