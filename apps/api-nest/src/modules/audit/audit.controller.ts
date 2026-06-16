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
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }).then((logs) =>
      logs.map((log) => {
        const metadata = typeof log.metadata === "object" && log.metadata ? (log.metadata as Record<string, unknown>) : {};
        const userName =
          (typeof metadata.userName === "string" && metadata.userName) ||
          (typeof metadata.email === "string" && metadata.email) ||
          (typeof metadata.subject === "string" && metadata.subject) ||
          "System";

        return {
          id: log.id,
          userId: log.userId ?? "",
          userName,
          action: normalizeAuditAction(log.action),
          entityType: log.entityType,
          entityId: log.entityId ?? "",
          description: (typeof metadata.description === "string" && metadata.description) || log.action,
          ipAddress: log.ipAddress ?? undefined,
          createdAt: log.createdAt.toISOString()
        };
      })
    );
  }
}

function normalizeAuditAction(action: string) {
  if (
    action === "CREATE_DOCUMENT" ||
    action === "UPDATE_DOCUMENT" ||
    action === "DELETE_DOCUMENT" ||
    action === "VIEW_DOCUMENT" ||
    action === "DOWNLOAD_DOCUMENT" ||
    action === "VIEW_FILE" ||
    action === "DOWNLOAD_FILE" ||
    action === "ARCHIVE_DOCUMENT" ||
    action === "CLASSIFY_DOCUMENT_ARCHIVE" ||
    action === "CREATE_ARCHIVE_ANNOTATION" ||
    action === "UPLOAD_ARCHIVE_ANNOTATION_FILE" ||
    action === "VALIDATE_DOCUMENT" ||
    action === "REJECT_DOCUMENT" ||
    action === "LOGIN" ||
    action === "LOGOUT"
  ) {
    return action;
  }

  return "VIEW_DOCUMENT";
}
