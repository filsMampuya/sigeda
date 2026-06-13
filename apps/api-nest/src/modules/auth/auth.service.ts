import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedPrincipal } from "./auth.types.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async me(principal: AuthenticatedPrincipal) {
    const user = await this.findUserByPrincipal(principal);

    if (!user) {
      return {
        user: {
          id: principal.sub,
          email: principal.email ?? "",
          displayName: principal.name ?? principal.email ?? principal.sub,
          role: principal.roles[0] ?? "AGENT",
          directionId: principal.departmentId ?? null,
          serviceId: null,
          bureauId: null
        }
      };
    }

    const departmentScope = resolveDepartmentScope(user.department);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: [user.nom, user.prenom].filter(Boolean).join(" ").trim() || principal.name || user.email,
        role: user.role.code,
        directionId: departmentScope.directionId,
        serviceId: departmentScope.serviceId,
        bureauId: departmentScope.bureauId
      }
    };
  }

  private async findUserByPrincipal(principal: AuthenticatedPrincipal) {
    const include = {
      role: true,
      department: {
        include: {
          parent: {
            include: {
              parent: true
            }
          }
        }
      }
    } as const;

    const byKeycloakId = await this.prisma.user.findUnique({
      where: { keycloakId: principal.sub },
      include
    });

    if (byKeycloakId) {
      return byKeycloakId;
    }

    const normalizedEmail = principal.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive"
        }
      },
      include
    });
  }
}
