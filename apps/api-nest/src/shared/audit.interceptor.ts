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

        void this.prisma.auditLog.create({
          data: {
            action: `${request.method} ${request.path}`,
            entityType: "HTTP_REQUEST",
            userId: undefined,
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
            metadata: {
              subject: request.user?.sub,
              email: request.user?.email
            }
          }
        }).catch(() => undefined);
      })
    );
  }
}
