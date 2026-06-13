import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { tap } from "rxjs";
import { PrismaService } from "../modules/prisma/prisma.service.js";
import type { AuthenticatedPrincipal } from "../modules/auth/auth.types.js";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedPrincipal }>();

    return next.handle().pipe(
      tap(() => {
        if (request.method === "GET") {
          return;
        }

        void this.logRequestAudit(request);
      })
    );
  }

  private async logRequestAudit(request: Request & { user?: AuthenticatedPrincipal }) {
    const dbUser = request.user?.sub
      ? await this.prisma.user
          .findUnique({
            where: {
              keycloakId: request.user.sub
            },
            select: {
              id: true
            }
          })
          .catch(() => null)
      : null;

    return this.prisma.auditLog.create({
      data: {
        action: `${request.method} ${request.path}`,
        entityType: "HTTP_REQUEST",
        userId: dbUser?.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
        metadata: {
          subject: request.user?.sub,
          email: request.user?.email
        }
      }
    });
  }
}
