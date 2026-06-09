import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Request } from "express";
import type { AuthenticatedPrincipal } from "./auth.types.js";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedPrincipal }>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer token required.");
    }

    const issuer = process.env.KEYCLOAK_ISSUER;
    const audience = process.env.KEYCLOAK_AUDIENCE;

    if (!issuer || !audience) {
      throw new UnauthorizedException("Keycloak is not configured.");
    }

    const jwksUri = process.env.KEYCLOAK_JWKS_URI ?? `${issuer}/protocol/openid-connect/certs`;
    const jwks = createRemoteJWKSet(new URL(jwksUri));
    const { payload } = await jwtVerify(header.slice("Bearer ".length), jwks, {
      issuer
    });
    const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
    const authorizedParty = typeof payload.azp === "string" ? payload.azp : undefined;

    if (!tokenAudiences.includes(audience) && authorizedParty !== audience) {
      throw new UnauthorizedException("Invalid token audience.");
    }
    const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
    const resourceAccess = payload.resource_access as Record<string, { roles?: string[] }> | undefined;
    const clientRoles = resourceAccess?.[audience]?.roles ?? [];

    request.user = {
      sub: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      roles: Array.from(new Set([...(realmAccess?.roles ?? []), ...clientRoles])),
      departmentId: typeof payload.departmentId === "string" ? payload.departmentId : undefined
    };

    return true;
  }
}
