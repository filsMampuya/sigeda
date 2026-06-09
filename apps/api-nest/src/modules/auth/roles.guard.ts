import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { REQUIRED_ROLES } from "./roles.decorator.js";
import type { AuthenticatedPrincipal } from "./auth.types.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedPrincipal }>();
    const hasRole = requiredRoles.some((role) => request.user?.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException("Insufficient role.");
    }

    return true;
  }
}
